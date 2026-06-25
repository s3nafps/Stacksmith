import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import type { DeploymentConfig, GeneratedFile, ValidationResult } from '@/types/deployment';
import { DeploymentConfigSchema } from '@/types/deployment';
import { generate } from '@/features/generator/generator-service';
import { TerraformValidator } from '@/features/validation/validator';
import { getGitHubProvider } from '@/features/github';
import { generateBranchName } from '@/lib/path-safety';
import { NotFoundError, AppError } from '@/lib/errors';
import { decryptToken } from '@/lib/encryption';
import type { DeploymentStatus, ActivityType, Prisma } from '@prisma/client';
import { encrypt, decrypt } from '@/lib/vault';

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isSensitiveInput(key: string, blueprintInputs?: Array<{ name: string; type: string }>): boolean {
  const input = blueprintInputs?.find((item) => item.name === key);
  return input?.type === 'sensitive' || /(password|secret|token|key)/i.test(key);
}

function blueprintInputsFromJson(value: unknown): Array<{ name: string; type: string }> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is { name: string; type: string } => (
    typeof item === 'object' &&
    item !== null &&
    'name' in item &&
    'type' in item &&
    typeof item.name === 'string' &&
    typeof item.type === 'string'
  ));
}

// ---------- Activity Logging ----------

async function logActivity(params: {
  deploymentId: string;
  userId?: string;
  type: ActivityType;
  title: string;
  description?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.activityEvent.create({
    data: {
      deploymentId: params.deploymentId,
      userId: params.userId,
      type: params.type,
      title: params.title,
      description: params.description,
      metadata: params.metadata,
    },
  });
}

async function setStatus(
  deploymentId: string,
  status: DeploymentStatus,
  extra?: Record<string, unknown>
): Promise<void> {
  const current = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    select: { status: true },
  });

  if (!current) {
    throw new NotFoundError('Deployment', deploymentId);
  }

  const currentStatus = current.status;

  const ALLOWED_TRANSITIONS: Record<DeploymentStatus, Set<DeploymentStatus>> = {
    DRAFT: new Set<DeploymentStatus>(['GENERATING']),
    GENERATING: new Set<DeploymentStatus>(['GENERATED', 'VALIDATING', 'VALIDATED', 'READY', 'FAILED']),
    GENERATED: new Set<DeploymentStatus>(['VALIDATING', 'GENERATING', 'FAILED']),
    VALIDATING: new Set<DeploymentStatus>(['VALIDATED', 'FAILED_VALIDATION', 'FAILED']),
    VALIDATED: new Set<DeploymentStatus>(['CREATING_PULL_REQUEST', 'GENERATING']),
    FAILED_VALIDATION: new Set<DeploymentStatus>(['GENERATING']),
    READY: new Set<DeploymentStatus>(['CREATING_PULL_REQUEST', 'GENERATING', 'VALIDATING']),
    CREATING_PULL_REQUEST: new Set<DeploymentStatus>(['PULL_REQUEST_OPEN', 'FAILED']),
    PULL_REQUEST_OPEN: new Set<DeploymentStatus>(['MERGED', 'CLOSED', 'UPDATE_AVAILABLE']),
    MERGED: new Set<DeploymentStatus>([]),
    CLOSED: new Set<DeploymentStatus>(['GENERATING']),
    UPDATE_AVAILABLE: new Set<DeploymentStatus>(['GENERATING']),
    FAILED: new Set<DeploymentStatus>(['GENERATING']),
  };

  if (currentStatus !== status && !ALLOWED_TRANSITIONS[currentStatus]?.has(status)) {
    throw new AppError(
      `Invalid state transition: Cannot change deployment status from ${currentStatus} to ${status}`,
      400,
      'INVALID_STATE_TRANSITION'
    );
  }

  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status, ...extra },
  });
}

// ---------- Public API ----------

export async function createDraft(
  userId: string,
  config: DeploymentConfig
): Promise<string> {
  const parsed = DeploymentConfigSchema.parse(config);

  // Resolve workspaceId
  let resolvedWorkspaceId = parsed.workspaceId;
  if (!resolvedWorkspaceId) {
    const member = await prisma.workspaceMember.findFirst({
      where: { userId },
    });
    if (!member) {
      throw new AppError('User does not belong to any workspace', 400, 'NO_WORKSPACE');
    }
    resolvedWorkspaceId = member.workspaceId;
  }

  // Verify blueprint exists with workspace scope scoping
  const blueprint = await prisma.blueprint.findFirst({
    where: {
      slug: parsed.blueprintSlug,
      OR: [
        { ownerId: null },
        { workspaceId: resolvedWorkspaceId },
      ],
    },
    include: { versions: true },
  });

  if (!blueprint) {
    throw new NotFoundError('Blueprint', parsed.blueprintSlug);
  }

  const version = blueprint.versions.find(
    (v) => v.version === parsed.blueprintVersion
  );
  if (!version) {
    throw new NotFoundError(
      'BlueprintVersion',
      `${parsed.blueprintSlug}@${parsed.blueprintVersion}`
    );
  }

  // Fetch workspace details and check limits
  const workspace = await prisma.workspace.findUnique({
    where: { id: resolvedWorkspaceId },
    include: {
      _count: {
        select: { deployments: true },
      },
      members: {
        where: { userId },
      },
    },
  });

  if (!workspace) {
    throw new NotFoundError('Workspace', resolvedWorkspaceId);
  }

  if (workspace.members.length === 0) {
    throw new AppError('Forbidden: You are not a member of this workspace', 403, 'FORBIDDEN');
  }

  // Enforce Free tier limit of 3 deployments per workspace
  if (workspace.billingPlan === 'free' && workspace._count.deployments >= 3) {
    throw new AppError(
      'Free tier limit reached: Free workspaces are limited to 3 deployments. Please upgrade to Pro for unlimited deployments.',
      402,
      'LIMIT_EXCEEDED'
    );
  }

  // Resolve repositoryId (might be database UUID or GitHub ID number/string) under workspace scope
  let resolvedRepositoryId: string | null = null;
  if (parsed.repositoryId) {
    const repoStr = String(parsed.repositoryId);
    const repoNum = Number(parsed.repositoryId);
    const dbRepo = await prisma.repository.findFirst({
      where: {
        OR: [
          { id: repoStr },
          { githubRepoId: isNaN(repoNum) ? -1 : repoNum },
        ],
        workspaceId: resolvedWorkspaceId,
      },
    });
    if (!dbRepo) {
      throw new NotFoundError('Repository', repoStr);
    }
    resolvedRepositoryId = dbRepo.id;
  }

  const deploymentId = nanoid(12);

  const deployment = await prisma.deployment.create({
    data: {
      id: deploymentId,
      userId,
      blueprintId: blueprint.id,
      blueprintVersionId: version.id,
      repositoryId: resolvedRepositoryId,
      workspaceId: resolvedWorkspaceId,
      status: 'DRAFT',
      targetDir: parsed.targetDir,
      environmentName: parsed.environmentName,
      toolPreference: parsed.toolPreference,
    },
  });

  // Store inputs
  const inputEntries = Object.entries(parsed.inputs);
  if (inputEntries.length > 0) {
    const blueprintInputs = blueprintInputsFromJson(version.inputs);
    await prisma.deploymentInput.createMany({
      data: inputEntries.map(([key, value]) => {
        const isSensitive = isSensitiveInput(key, blueprintInputs);
        const rawVal = String(value);
        return {
          deploymentId: deployment.id,
          key,
          value: isSensitive ? encrypt(rawVal) : rawVal,
          isSensitive,
        };
      }),
    });
  }

  await logActivity({
    deploymentId: deployment.id,
    userId,
    type: 'DEPLOYMENT_CREATED',
    title: 'Deployment created',
    description: `Draft deployment for ${parsed.blueprintSlug}@${parsed.blueprintVersion}`,
  });

  return deployment.id;
}

export async function updateInputs(
  deploymentId: string,
  inputs: Record<string, string | number | boolean>
): Promise<void> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { blueprintVersion: true },
  });

  if (!deployment) {
    throw new NotFoundError('Deployment', deploymentId);
  }

  if (deployment.status !== 'DRAFT') {
    throw new AppError('Can only update inputs on DRAFT deployments', 400, 'INVALID_STATE');
  }

  // Upsert inputs
  for (const [key, value] of Object.entries(inputs)) {
    const isSensitive = isSensitiveInput(key, blueprintInputsFromJson(deployment.blueprintVersion.inputs));
    const rawVal = String(value);
    const storedVal = isSensitive ? encrypt(rawVal) : rawVal;

    await prisma.deploymentInput.upsert({
      where: { deploymentId_key: { deploymentId, key } },
      create: {
        deploymentId,
        key,
        value: storedVal,
        isSensitive,
      },
      update: {
        value: storedVal,
        isSensitive,
      },
    });
  }

  await logActivity({
    deploymentId,
    userId: deployment.userId,
    type: 'DEPLOYMENT_CONFIGURED',
    title: 'Inputs updated',
    description: `Updated ${Object.keys(inputs).length} input(s)`,
  });
}

export async function generateDeployment(
  deploymentId: string
): Promise<GeneratedFile[]> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: {
      blueprint: true,
      blueprintVersion: true,
      inputs: true,
    },
  });

  if (!deployment) {
    throw new NotFoundError('Deployment', deploymentId);
  }

  await setStatus(deploymentId, 'GENERATING');
  await logActivity({
    deploymentId,
    userId: deployment.userId,
    type: 'GENERATION_STARTED',
    title: 'Generation started',
  });

  try {
    const inputsMap: Record<string, { value: string | number | boolean; sensitive: boolean }> = {};
    for (const inp of deployment.inputs) {
      inputsMap[inp.key] = {
        value: inp.isSensitive ? decrypt(inp.value) : inp.value,
        sensitive: inp.isSensitive,
      };
    }

    const result = await generate({
      blueprintSlug: deployment.blueprint.slug,
      blueprintVersion: deployment.blueprintVersion.version,
      deploymentId,
      targetDir: deployment.targetDir,
      environmentName: deployment.environmentName,
      inputs: inputsMap,
      workspaceId: deployment.workspaceId,
    });

    const managedFiles = result.files.map((f) => f.path);

    const configSnapshotMap: Record<string, string | number | boolean> = {};
    for (const inp of deployment.inputs) {
      configSnapshotMap[inp.key] = inp.isSensitive ? '[REDACTED]' : inp.value;
    }

    await setStatus(deploymentId, 'GENERATED', {
      managedFiles,
      generatorVersion: '1.0.0',
      configSnapshot: configSnapshotMap,
    });

    await logActivity({
      deploymentId,
      userId: deployment.userId,
      type: 'GENERATION_COMPLETED',
      title: 'Generation completed',
      description: `Generated ${result.files.length} files`,
      metadata: { fileCount: result.files.length, warnings: result.warnings },
    });

    return result.files;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    await setStatus(deploymentId, 'FAILED', { errorMessage: msg });
    await logActivity({
      deploymentId,
      userId: deployment.userId,
      type: 'GENERATION_FAILED',
      title: 'Generation failed',
      description: msg,
    });

    throw err;
  }
}

export async function previewDeploymentFiles(
  deploymentId: string
): Promise<GeneratedFile[]> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: {
      blueprint: true,
      blueprintVersion: true,
      inputs: true,
    },
  });

  if (!deployment) {
    throw new NotFoundError('Deployment', deploymentId);
  }

  const inputsMap: Record<string, { value: string | number | boolean; sensitive: boolean }> = {};
  for (const inp of deployment.inputs) {
    inputsMap[inp.key] = {
      value: inp.isSensitive ? '********' : inp.value,
      sensitive: inp.isSensitive,
    };
  }

  const result = await generate({
    blueprintSlug: deployment.blueprint.slug,
    blueprintVersion: deployment.blueprintVersion.version,
    deploymentId,
    targetDir: deployment.targetDir,
    environmentName: deployment.environmentName,
    inputs: inputsMap,
    workspaceId: deployment.workspaceId,
  });

  return result.files;
}

export async function validateDeployment(
  deploymentId: string
): Promise<ValidationResult> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { blueprint: true, blueprintVersion: true, inputs: true },
  });

  if (!deployment) {
    throw new NotFoundError('Deployment', deploymentId);
  }

  if (deployment.blueprint.ownerId) {
    throw new AppError(
      'Custom blueprint validation is temporarily unavailable',
      503,
      'CUSTOM_VALIDATION_DISABLED'
    );
  }

  await setStatus(deploymentId, 'VALIDATING');
  await logActivity({
    deploymentId,
    userId: deployment.userId,
    type: 'VALIDATION_STARTED',
    title: 'Validation started',
  });

  try {
    // Re-generate to get the files
    const inputsMap: Record<string, { value: string | number | boolean; sensitive: boolean }> = {};
    for (const inp of deployment.inputs) {
      inputsMap[inp.key] = {
        value: inp.isSensitive ? decrypt(inp.value) : inp.value,
        sensitive: inp.isSensitive,
      };
    }

    const genResult = await generate({
      blueprintSlug: deployment.blueprint.slug,
      blueprintVersion: deployment.blueprintVersion.version,
      deploymentId,
      targetDir: deployment.targetDir,
      environmentName: deployment.environmentName,
      inputs: inputsMap,
      workspaceId: deployment.workspaceId,
    });

    const validator = new TerraformValidator();
    const result = await validator.validate({
      files: genResult.files,
      toolPreference: deployment.toolPreference as 'terraform' | 'opentofu',
      deploymentId,
    });

    // Store validation run
    await prisma.validationRun.create({
      data: {
        deploymentId,
        status: result.status === 'passed' ? 'PASSED'
          : result.status === 'failed' ? 'FAILED'
          : result.status === 'skipped' ? 'SKIPPED'
          : 'ERROR',
        overallResult: result.status,
        commandResults: toJson(result.commands),
        warnings: result.warnings,
        errors: result.errors,
        securityFindings: toJson(result.securityFindings),
        durationMs: result.durationMs,
        startedAt: new Date(Date.now() - result.durationMs),
        completedAt: new Date(),
      },
    });

    const newStatus: DeploymentStatus =
      result.status === 'passed' ? 'VALIDATED' : 'FAILED_VALIDATION';

    await setStatus(deploymentId, newStatus);

    const activityType: ActivityType =
      result.status === 'passed'
        ? 'VALIDATION_PASSED'
        : 'VALIDATION_FAILED';

    await logActivity({
      deploymentId,
      userId: deployment.userId,
      type: activityType,
      title: `Validation ${result.status}`,
      description: `${result.commands.length} commands run in ${result.durationMs}ms`,
      metadata: { warnings: result.warnings, errors: result.errors },
    });

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await setStatus(deploymentId, 'FAILED_VALIDATION', { errorMessage: msg });
    throw err;
  }
}

export async function createPullRequest(
  deploymentId: string
): Promise<{ prNumber: number; prUrl: string }> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: {
      blueprint: true,
      blueprintVersion: true,
      inputs: true,
      repository: { include: { installation: { include: { connection: true } } } },
    },
  });

  if (!deployment) {
    throw new NotFoundError('Deployment', deploymentId);
  }

  if (deployment.status !== 'VALIDATED' && deployment.status !== 'READY') {
    throw new AppError(
      'Deployment must be in VALIDATED state to create a PR',
      400,
      'INVALID_STATE'
    );
  }

  // Fetch latest validation run to ensure it passed (prevent skipped validation from opening PRs)
  const latestValidation = await prisma.validationRun.findFirst({
    where: { deploymentId },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestValidation || latestValidation.status !== 'PASSED') {
    throw new AppError(
      'Deployment must have a passing validation run to create a PR',
      400,
      'VALIDATION_REQUIRED'
    );
  }

  await setStatus(deploymentId, 'CREATING_PULL_REQUEST');
  await logActivity({
    deploymentId,
    userId: deployment.userId,
    type: 'PR_CREATION_STARTED',
    title: 'PR creation started',
  });

  try {
    // Re-generate files
    const inputsMap: Record<string, { value: string | number | boolean; sensitive: boolean }> = {};
    for (const inp of deployment.inputs) {
      inputsMap[inp.key] = {
        value: inp.isSensitive ? decrypt(inp.value) : inp.value,
        sensitive: inp.isSensitive,
      };
    }

    const genResult = await generate({
      blueprintSlug: deployment.blueprint.slug,
      blueprintVersion: deployment.blueprintVersion.version,
      deploymentId,
      targetDir: deployment.targetDir,
      environmentName: deployment.environmentName,
      inputs: inputsMap,
      workspaceId: deployment.workspaceId,
    });

    const provider = getGitHubProvider();

    // Get the repo full name and access token
    const repo = deployment.repository;
    if (!repo) {
      throw new AppError('No repository linked to this deployment', 400, 'NO_REPOSITORY');
    }

    if (repo.workspaceId !== deployment.workspaceId) {
      throw new AppError('Repository workspace mismatch', 403, 'FORBIDDEN');
    }

    const connection = repo.installation?.connection;
    if (!connection) {
      throw new AppError('No GitHub connection found', 400, 'NO_CONNECTION');
    }

    const accessToken = decryptToken(connection.accessToken);
    if (!accessToken) {
      throw new AppError('Failed to decrypt access token', 500, 'TOKEN_ERROR');
    }

    const branchName = generateBranchName(deployment.blueprint.slug, deploymentId);

    const pr = await provider.createPullRequest(accessToken, {
      repoFullName: repo.fullName,
      title: `[Stacksmith] Add ${deployment.blueprint.name} (${deployment.environmentName})`,
      body: [
        `## Stacksmith Deployment`,
        '',
        `**Blueprint:** ${deployment.blueprint.name} v${deployment.blueprintVersion.version}`,
        `**Environment:** ${deployment.environmentName}`,
        `**Deployment ID:** ${deploymentId}`,
        '',
        '---',
        '_This PR was generated by Stacksmith._',
      ].join('\n'),
      headBranch: branchName,
      baseBranch: repo.defaultBranch,
      files: genResult.files,
      commitMessage: `feat(infra): add ${deployment.blueprint.slug} via Stacksmith`,
    });

    // Store PR record
    await prisma.pullRequest.create({
      data: {
        deploymentId,
        prNumber: pr.number,
        prUrl: pr.htmlUrl,
        branchName,
        title: pr.title,
        status: 'open',
        isMock: process.env.MOCK_GITHUB_API === 'true',
      },
    });

    await setStatus(deploymentId, 'PULL_REQUEST_OPEN');
    await logActivity({
      deploymentId,
      userId: deployment.userId,
      type: 'PR_CREATED',
      title: 'Pull request created',
      description: `PR #${pr.number}: ${pr.title}`,
      metadata: { prNumber: pr.number, prUrl: pr.htmlUrl, branchName },
    });

    return { prNumber: pr.number, prUrl: pr.htmlUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await setStatus(deploymentId, 'FAILED', { errorMessage: msg });
    throw err;
  }
}

export async function getDeployment(deploymentId: string) {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: {
      blueprint: true,
      blueprintVersion: true,
      inputs: true,
      validationRuns: { orderBy: { createdAt: 'desc' }, take: 1 },
      pullRequests: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!deployment) {
    throw new NotFoundError('Deployment', deploymentId);
  }

  return deployment;
}

export async function listDeployments(userId: string, workspaceId?: string) {
  let targetWorkspaceId = workspaceId;
  if (!targetWorkspaceId) {
    const member = await prisma.workspaceMember.findFirst({
      where: { userId },
    });
    if (!member) return [];
    targetWorkspaceId = member.workspaceId;
  }

  return prisma.deployment.findMany({
    where: {
      workspaceId: targetWorkspaceId,
      workspace: {
        members: {
          some: { userId },
        },
      },
    },
    include: {
      blueprint: true,
      blueprintVersion: true,
      repository: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getActivity(deploymentId: string) {
  return prisma.activityEvent.findMany({
    where: { deploymentId },
    orderBy: { createdAt: 'desc' },
  });
}
