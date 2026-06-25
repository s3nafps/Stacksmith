import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { NotFoundError, AppError } from '@/lib/errors';
import { decryptToken } from '@/lib/encryption';
import { compareVersions, checkForUpdates } from '@/features/blueprints/blueprint-service';
import { generate } from '@/features/generator/generator-service';
import { parseManifest } from '@/features/generator/manifest';
import { getGitHubProvider } from '@/features/github';
import { compareManifests, simpleHash, type ConflictEntry } from './conflict-detector';
import type { VersionComparison } from '@/features/blueprints/blueprint-service';

export interface UpgradeCheck {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
}

export interface UpgradeDetails {
  currentVersion: string;
  targetVersion: string;
  comparison: VersionComparison;
  conflicts: ConflictEntry[];
}

export async function checkForUpgrade(
  deploymentId: string
): Promise<UpgradeCheck> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { blueprint: true, blueprintVersion: true },
  });

  if (!deployment) {
    throw new NotFoundError('Deployment', deploymentId);
  }

  const result = await checkForUpdates(
    deployment.blueprint.slug,
    deployment.blueprintVersion.version
  );

  if (result.available) {
    // Update status to indicate an upgrade is available
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'UPDATE_AVAILABLE' },
    });

    await prisma.activityEvent.create({
      data: {
        deploymentId,
        type: 'UPGRADE_AVAILABLE',
        title: 'Upgrade available',
        description: `Version ${result.latestVersion} is available (current: ${deployment.blueprintVersion.version})`,
      },
    });
  }

  return {
    available: result.available,
    currentVersion: deployment.blueprintVersion.version,
    latestVersion: result.latestVersion,
  };
}

export async function getUpgradeDetails(
  deploymentId: string
): Promise<UpgradeDetails> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: {
      blueprint: true,
      blueprintVersion: true,
      repository: { include: { installation: { include: { connection: true } } } },
      inputs: true,
    },
  });

  if (!deployment) {
    throw new NotFoundError('Deployment', deploymentId);
  }

  const updateCheck = await checkForUpdates(
    deployment.blueprint.slug,
    deployment.blueprintVersion.version
  );

  if (!updateCheck.available) {
    throw new AppError('No upgrade available', 400, 'NO_UPGRADE');
  }

  const comparison = await compareVersions(
    deployment.blueprint.slug,
    deployment.blueprintVersion.version,
    updateCheck.latestVersion
  );

  // Detect conflicts by checking current repo files against manifest
  const conflicts = await detectConflictsInternal(deployment);

  return {
    currentVersion: deployment.blueprintVersion.version,
    targetVersion: updateCheck.latestVersion,
    comparison,
    conflicts,
  };
}

export async function startUpgrade(
  deploymentId: string
): Promise<void> {
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

  const updateCheck = await checkForUpdates(
    deployment.blueprint.slug,
    deployment.blueprintVersion.version
  );

  if (!updateCheck.available) {
    throw new AppError('No upgrade available', 400, 'NO_UPGRADE');
  }

  await prisma.activityEvent.create({
    data: {
      deploymentId,
      type: 'UPGRADE_STARTED',
      title: 'Upgrade started',
      description: `Upgrading from ${deployment.blueprintVersion.version} to ${updateCheck.latestVersion}`,
    },
  });

  // Find the new version record
  const newVersion = await prisma.blueprintVersion.findFirst({
    where: {
      blueprintId: deployment.blueprintId,
      version: updateCheck.latestVersion,
    },
  });

  if (!newVersion) {
    throw new NotFoundError(
      'BlueprintVersion',
      `${deployment.blueprint.slug}@${updateCheck.latestVersion}`
    );
  }

  // Update deployment to point to new version
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: {
      blueprintVersionId: newVersion.id,
      status: 'DRAFT',
    },
  });

  // Re-generate with new version
  const inputsMap: Record<string, string | number | boolean> = {};
  for (const inp of deployment.inputs) {
    inputsMap[inp.key] = inp.value;
  }

  await generate({
    blueprintSlug: deployment.blueprint.slug,
    blueprintVersion: updateCheck.latestVersion,
    deploymentId,
    targetDir: deployment.targetDir,
    environmentName: deployment.environmentName,
    inputs: inputsMap,
  });

  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status: 'READY' },
  });

  await prisma.activityEvent.create({
    data: {
      deploymentId,
      type: 'UPGRADE_COMPLETED',
      title: 'Upgrade completed',
      description: `Successfully upgraded to ${updateCheck.latestVersion}`,
    },
  });
}

export async function detectConflicts(
  deploymentId: string
): Promise<ConflictEntry[]> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: {
      blueprint: true,
      blueprintVersion: true,
      repository: { include: { installation: { include: { connection: true } } } },
      inputs: true,
    },
  });

  if (!deployment) {
    throw new NotFoundError('Deployment', deploymentId);
  }

  return detectConflictsInternal(deployment);
}

async function detectConflictsInternal(
  deployment: {
    id: string;
    managedFiles: unknown;
    blueprint: { slug: string };
    blueprintVersion: { version: string };
    targetDir: string;
    environmentName: string;
    repository?: {
      fullName: string;
      defaultBranch: string;
      installation?: { connection?: { accessToken: string } } | null;
    } | null;
    inputs: Array<{ key: string; value: string }>;
  }
): Promise<ConflictEntry[]> {
  // If no managed files manifest, no conflicts to detect
  if (!deployment.managedFiles || !Array.isArray(deployment.managedFiles)) {
    return [];
  }

  const repo = deployment.repository;
  if (!repo?.installation?.connection) {
    // No repo connection, can't check for conflicts
    return [];
  }

  const accessToken = decryptToken(repo.installation.connection.accessToken);
  if (!accessToken) return [];

  const provider = getGitHubProvider();

  // Get current file contents from the repo
  const currentFiles = new Map<string, string | null>();
  const managedFiles = deployment.managedFiles as string[];

  for (const filePath of managedFiles) {
    const content = await provider.getFileContent(
      accessToken,
      repo.fullName,
      filePath,
      repo.defaultBranch
    );
    currentFiles.set(filePath, content !== null ? simpleHash(content) : null);
  }

  // Get the manifest from the repo
  const manifestPath = `${deployment.targetDir}/.infrapack.json`;
  const manifestContent = await provider.getFileContent(
    accessToken,
    repo.fullName,
    manifestPath,
    repo.defaultBranch
  );

  if (!manifestContent) {
    return [];
  }

  const manifest = parseManifest(manifestContent);

  // Re-generate to get original hashes
  const inputsMap: Record<string, string | number | boolean> = {};
  for (const inp of deployment.inputs) {
    inputsMap[inp.key] = inp.value;
  }

  const genResult = await generate({
    blueprintSlug: deployment.blueprint.slug,
    blueprintVersion: deployment.blueprintVersion.version,
    deploymentId: deployment.id,
    targetDir: deployment.targetDir,
    environmentName: deployment.environmentName,
    inputs: inputsMap,
  });

  const originalHashes = new Map<string, string>();
  for (const file of genResult.files) {
    originalHashes.set(file.path, simpleHash(file.content));
  }

  const conflicts = compareManifests(manifest, currentFiles, originalHashes);

  if (conflicts.length > 0) {
    await prisma.activityEvent.create({
      data: {
        deploymentId: deployment.id,
        type: 'CONFLICT_DETECTED',
        title: 'Conflicts detected',
        description: `${conflicts.length} conflict(s) found`,
        metadata: { conflicts } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return conflicts;
}
