import { nanoid } from 'nanoid';
import { BlueprintMetadataSchema, type BlueprintMetadata } from '@/types/blueprint';
import { ValidationError, NotFoundError, AppError } from '@/lib/errors';
import { isPathSegmentSafe } from '@/lib/path-safety';
import { TerraformValidator } from '@/features/validation/validator';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/encryption';
import { getGitHubProvider } from '@/features/github';
import type { GeneratedFile } from '@/types/deployment';

export interface CustomBlueprintInput {
  slug: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDeployTime?: string;
  tags: string[];
  architectureSummary?: string;
  securityNotes?: string;
  versionsTf?: string;
  variablesTf: string;
  mainTf: string;
  outputsTf: string;
  inputs?: any[]; // Visual variables editor definitions
}

const VERSION = '1.0.0';

function assertSafeSlug(slug: string): void {
  if (!/^[a-z0-9-]+$/.test(slug) || !isPathSegmentSafe(slug)) {
    throw new ValidationError('Invalid blueprint slug', {
      slug: ['Use lowercase letters, numbers, and hyphens only.'],
    });
  }
}

function metadataFromInput(input: CustomBlueprintInput): BlueprintMetadata {
  const inputs = input.inputs || Array.from(input.variablesTf.matchAll(/variable\s+"([^"]+)"/g)).map((match) => ({
    name: match[1],
    type: 'text' as const,
    label: match[1].replace(/_/g, ' '),
    description: `Terraform variable ${match[1]}.`,
    required: false,
  }));

  const outputs = Array.from(input.outputsTf.matchAll(/output\s+"([^"]+)"/g)).map((match) => ({
    name: match[1],
    description: `Terraform output ${match[1]}.`,
  }));

  const metadata = {
    slug: input.slug,
    name: input.name,
    description: input.description,
    provider: 'aws',
    category: input.category,
    difficulty: input.difficulty,
    estimatedDeployTime: input.estimatedDeployTime || '10-20 minutes',
    tags: input.tags,
    architectureSummary: input.architectureSummary,
    securityNotes: input.securityNotes,
    versions: [
      {
        version: VERSION,
        changelog: 'Initial custom blueprint version.',
        sourceDir: 'db',
        inputs,
        outputs,
      },
    ],
  };

  return BlueprintMetadataSchema.parse(metadata);
}

function filesFromInput(input: CustomBlueprintInput, metadata: BlueprintMetadata): GeneratedFile[] {
  return [
    { path: 'versions.tf', content: input.versionsTf || defaultVersionsTf() },
    { path: 'variables.tf', content: input.variablesTf },
    { path: 'main.tf', content: input.mainTf },
    { path: 'outputs.tf', content: input.outputsTf },
    {
      path: 'README.md',
      content: `# ${metadata.name}\n\n${metadata.description}\n\nCustom InfraPack blueprint.\n`,
    },
  ];
}

function defaultVersionsTf(): string {
  return `terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}
`;
}

async function validateTerraform(files: GeneratedFile[], slug: string) {
  // Custom blueprint validation is disabled until a secure sandbox environment is implemented.
  console.warn(`[custom-blueprint-service] Skipping validation for custom blueprint "${slug}" (disabled until sandboxed)`);
  return {
    status: 'passed',
    errors: [],
    warnings: ['Terraform validation skipped (disabled until sandboxed)'],
    commands: [],
    durationMs: 0,
    securityFindings: [],
  };
}

function toBlueprintMetadata(bp: any): BlueprintMetadata {
  const latestVersion = bp.versions[bp.versions.length - 1];
  return {
    slug: bp.slug,
    name: bp.name,
    description: bp.description,
    provider: bp.provider as 'aws',
    category: bp.category,
    difficulty: bp.difficulty as 'beginner' | 'intermediate' | 'advanced',
    estimatedDeployTime: latestVersion?.estimatedDeployTime || undefined,
    tags: bp.tags ? bp.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    architectureSummary: latestVersion?.architectureSummary || undefined,
    securityNotes: latestVersion?.securityNotes || undefined,
    versions: bp.versions.map((v: any) => ({
      version: v.version,
      changelog: v.changelog || undefined,
      sourceDir: v.sourceDir,
      inputs: typeof v.inputs === 'string' ? JSON.parse(v.inputs) : v.inputs,
      outputs: typeof v.outputs === 'string' ? JSON.parse(v.outputs) : v.outputs,
      files: v.files ? (typeof v.files === 'string' ? JSON.parse(v.files) : v.files) : undefined,
    })),
    ownerId: bp.ownerId || undefined,
  };
}

export async function createCustomBlueprint(
  input: CustomBlueprintInput,
  ownerUserId: string,
  workspaceId?: string
) {
  assertSafeSlug(input.slug);

  const existing = await prisma.blueprint.findUnique({
    where: { slug: input.slug },
  });
  if (existing) {
    throw new AppError('Custom blueprint already exists', 409, 'BLUEPRINT_EXISTS');
  }

  const metadata = metadataFromInput(input);
  const files = filesFromInput(input, metadata);
  await validateTerraform(files, input.slug);

  const filesMap: Record<string, string> = {};
  for (const f of files) {
    filesMap[f.path] = f.content;
  }

  const blueprint = await prisma.blueprint.create({
    data: {
      slug: input.slug,
      name: input.name,
      description: input.description,
      provider: 'aws',
      category: input.category,
      difficulty: input.difficulty,
      tags: input.tags.join(','),
      ownerId: ownerUserId,
      workspaceId: workspaceId || undefined,
      isActive: true,
      versions: {
        create: {
          version: VERSION,
          changelog: 'Initial custom blueprint version.',
          architectureSummary: input.architectureSummary || '',
          securityNotes: input.securityNotes || '',
          estimatedDeployTime: input.estimatedDeployTime || '10-20 minutes',
          sourceDir: 'db',
          inputs: metadata.versions[0].inputs as any,
          outputs: metadata.versions[0].outputs as any,
          files: filesMap,
          isLatest: true,
        },
      },
    },
    include: {
      versions: true,
    },
  });

  return toBlueprintMetadata(blueprint);
}

export async function updateCustomBlueprint(
  slug: string,
  input: CustomBlueprintInput,
  userId: string
) {
  assertSafeSlug(slug);

  const bp = await prisma.blueprint.findUnique({
    where: { slug },
    include: { versions: { orderBy: { createdAt: 'desc' } } },
  });

  if (!bp) throw new NotFoundError('Blueprint', slug);
  if (bp.ownerId !== userId) {
    throw new AppError('Blueprint does not belong to current user', 403, 'FORBIDDEN');
  }

  const metadata = metadataFromInput(input);
  const files = filesFromInput(input, metadata);
  await validateTerraform(files, slug);

  const filesMap: Record<string, string> = {};
  for (const f of files) {
    filesMap[f.path] = f.content;
  }

  // Update Blueprint metadata
  await prisma.blueprint.update({
    where: { slug },
    data: {
      name: input.name,
      description: input.description,
      category: input.category,
      difficulty: input.difficulty,
      tags: input.tags.join(','),
    },
  });

  // Update latest version
  const latestVer = bp.versions[bp.versions.length - 1];
  if (latestVer) {
    await prisma.blueprintVersion.update({
      where: { id: latestVer.id },
      data: {
        architectureSummary: input.architectureSummary || '',
        securityNotes: input.securityNotes || '',
        estimatedDeployTime: input.estimatedDeployTime || '10-20 minutes',
        inputs: metadata.versions[0].inputs as any,
        outputs: metadata.versions[0].outputs as any,
        files: filesMap,
      },
    });
  }

  const updated = await prisma.blueprint.findUnique({
    where: { slug },
    include: { versions: { orderBy: { createdAt: 'asc' } } },
  });
  return toBlueprintMetadata(updated);
}

export async function createCustomBlueprintVersion(
  slug: string,
  version: string,
  input: CustomBlueprintInput,
  userId: string
) {
  assertSafeSlug(slug);
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new ValidationError('Invalid version format. Use semver e.g., 1.1.0');
  }

  const bp = await prisma.blueprint.findUnique({
    where: { slug },
    include: { versions: true },
  });

  if (!bp) throw new NotFoundError('Blueprint', slug);
  if (bp.ownerId !== userId) {
    throw new AppError('Blueprint does not belong to current user', 403, 'FORBIDDEN');
  }

  const versionExists = bp.versions.some((v) => v.version === version);
  if (versionExists) {
    throw new AppError(`Version ${version} already exists`, 409, 'VERSION_EXISTS');
  }

  const metadata = metadataFromInput(input);
  const files = filesFromInput(input, metadata);
  await validateTerraform(files, slug);

  const filesMap: Record<string, string> = {};
  for (const f of files) {
    filesMap[f.path] = f.content;
  }

  await prisma.$transaction([
    prisma.blueprintVersion.updateMany({
      where: { blueprintId: bp.id },
      data: { isLatest: false },
    }),
    prisma.blueprintVersion.create({
      data: {
        blueprintId: bp.id,
        version,
        changelog: 'New custom version.',
        architectureSummary: input.architectureSummary || '',
        securityNotes: input.securityNotes || '',
        estimatedDeployTime: input.estimatedDeployTime || '10-20 minutes',
        sourceDir: 'db',
        inputs: metadata.versions[0].inputs as any,
        outputs: metadata.versions[0].outputs as any,
        files: filesMap,
        isLatest: true,
      },
    }),
  ]);

  const updated = await prisma.blueprint.findUnique({
    where: { slug },
    include: { versions: { orderBy: { createdAt: 'asc' } } },
  });
  return toBlueprintMetadata(updated);
}

export async function deleteCustomBlueprint(slug: string, userId: string) {
  assertSafeSlug(slug);

  const bp = await prisma.blueprint.findUnique({
    where: { slug },
  });

  if (!bp) throw new NotFoundError('Blueprint', slug);
  if (bp.ownerId !== userId) {
    throw new AppError('Blueprint does not belong to current user', 403, 'FORBIDDEN');
  }

  await prisma.blueprint.delete({
    where: { slug },
  });

  return { success: true };
}

export async function syncCustomBlueprintToGitHub(
  slug: string,
  repositoryId: string,
  userId: string
) {
  const bp = await prisma.blueprint.findUnique({
    where: { slug },
    include: {
      versions: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!bp) throw new NotFoundError('Blueprint', slug);
  if (bp.ownerId !== userId) {
    throw new AppError('Blueprint does not belong to current user', 403, 'FORBIDDEN');
  }

  const latestVersion = bp.versions[0];
  if (!latestVersion) {
    throw new AppError('No version found for this blueprint', 400, 'NO_VERSION');
  }

  const rawFiles = latestVersion.files ? (typeof latestVersion.files === 'string' ? JSON.parse(latestVersion.files) : latestVersion.files) as Record<string, string> : {};

  const repoFiles = Object.entries(rawFiles).map(([filePath, content]) => ({
    path: `blueprints/custom/${slug}/versions/${latestVersion.version}/${filePath}`,
    content,
  }));

  const metadata = toBlueprintMetadata(bp);
  repoFiles.push({
    path: `blueprints/custom/${slug}/blueprint.json`,
    content: `${JSON.stringify(metadata, null, 2)}\n`,
  });

  const repo = await prisma.repository.findFirst({
    where: {
      OR: [
        { id: repositoryId },
        { githubRepoId: Number.isNaN(Number(repositoryId)) ? -1 : Number(repositoryId) },
      ],
      workspaceId: bp.workspaceId || undefined,
    },
    include: { installation: { include: { connection: true } } },
  });

  if (!repo) throw new NotFoundError('Repository', repositoryId);
  if (repo.installation.connection.userId !== userId) {
    throw new AppError('Repository does not belong to current user', 403, 'FORBIDDEN');
  }

  const token = decryptToken(repo.installation.connection.accessToken);
  if (!token) throw new AppError('Failed to decrypt GitHub token', 500, 'TOKEN_ERROR');

  const branch = `infrapack/blueprint/${slug}/${nanoid(8).toLowerCase()}`;
  const provider = getGitHubProvider();

  return provider.createPullRequest(token, {
    repoFullName: repo.fullName,
    title: `[InfraPack] Add custom blueprint ${slug}`,
    body: `Adds the custom InfraPack blueprint \`${slug}\` for review and reuse.`,
    headBranch: branch,
    baseBranch: repo.defaultBranch,
    files: repoFiles,
    commitMessage: `feat(infrapack): add custom blueprint ${slug}`,
  });
}
