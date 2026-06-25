import type { BlueprintMetadata, BlueprintVersion } from '@/types/blueprint';
import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/lib/errors';

export interface BlueprintFilter {
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  search?: string;
  tags?: string[];
  userId?: string;
  workspaceId?: string;
}

export interface VersionComparison {
  fromVersion: string;
  toVersion: string;
  changelog: string | undefined;
  inputsAdded: string[];
  inputsRemoved: string[];
  outputsAdded: string[];
  outputsRemoved: string[];
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

export async function listBlueprints(
  filter?: BlueprintFilter
): Promise<BlueprintMetadata[]> {
  const blueprintsFromDb = await prisma.blueprint.findMany({
    where: {
      isActive: true,
      OR: [
        { ownerId: null },
        ...(filter?.workspaceId ? [{ workspaceId: filter.workspaceId }] : []),
      ],
    },
    include: {
      versions: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  let blueprints = blueprintsFromDb.map(toBlueprintMetadata);

  if (!filter) return blueprints;

  if (filter.category) {
    const cat = filter.category.toLowerCase();
    blueprints = blueprints.filter(
      (bp) => bp.category.toLowerCase() === cat
    );
  }

  if (filter.difficulty) {
    blueprints = blueprints.filter(
      (bp) => bp.difficulty === filter.difficulty
    );
  }

  if (filter.tags && filter.tags.length > 0) {
    const filterTags = new Set(filter.tags.map((t) => t.toLowerCase()));
    blueprints = blueprints.filter((bp) =>
      bp.tags.some((tag) => filterTags.has(tag.toLowerCase()))
    );
  }

  if (filter.search) {
    const query = filter.search.toLowerCase();
    blueprints = blueprints.filter(
      (bp) =>
        bp.name.toLowerCase().includes(query) ||
        bp.description.toLowerCase().includes(query) ||
        bp.slug.toLowerCase().includes(query) ||
        bp.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  return blueprints;
}

export async function getBlueprint(
  slug: string,
  workspaceId?: string
): Promise<BlueprintMetadata> {
  const bp = await prisma.blueprint.findFirst({
    where: {
      slug,
      OR: [
        { ownerId: null },
        ...(workspaceId ? [{ workspaceId }] : []),
      ],
    },
    include: {
      versions: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!bp) {
    throw new NotFoundError('Blueprint', slug);
  }

  return toBlueprintMetadata(bp);
}

export async function getBlueprintVersion(
  slug: string,
  version: string,
  workspaceId?: string
): Promise<BlueprintVersion> {
  const bp = await prisma.blueprint.findFirst({
    where: {
      slug,
      OR: [
        { ownerId: null },
        ...(workspaceId ? [{ workspaceId }] : []),
      ],
    },
    include: {
      versions: {
        where: { version },
      },
    },
  });

  if (!bp || bp.versions.length === 0) {
    throw new NotFoundError('BlueprintVersion', `${slug}@${version}`);
  }

  const v = bp.versions[0];
  return {
    version: v.version,
    changelog: v.changelog || undefined,
    sourceDir: v.sourceDir,
    inputs: typeof v.inputs === 'string' ? JSON.parse(v.inputs) : v.inputs,
    outputs: typeof v.outputs === 'string' ? JSON.parse(v.outputs) : v.outputs,
    files: v.files ? (typeof v.files === 'string' ? JSON.parse(v.files) : v.files) : undefined,
  };
}

export async function getLatestVersion(slug: string, workspaceId?: string): Promise<BlueprintVersion> {
  const bp = await getBlueprint(slug, workspaceId);
  if (bp.versions.length === 0) {
    throw new NotFoundError('BlueprintVersion', `${slug}@latest`);
  }
  return bp.versions[bp.versions.length - 1];
}

export async function compareVersions(
  slug: string,
  fromVersion: string,
  toVersion: string,
  workspaceId?: string
): Promise<VersionComparison> {
  const bp = await getBlueprint(slug, workspaceId);
  const from = bp.versions.find((v) => v.version === fromVersion);
  const to = bp.versions.find((v) => v.version === toVersion);

  if (!from) throw new NotFoundError('BlueprintVersion', `${slug}@${fromVersion}`);
  if (!to) throw new NotFoundError('BlueprintVersion', `${slug}@${toVersion}`);

  const fromInputNames = new Set(from.inputs.map((i) => i.name));
  const toInputNames = new Set(to.inputs.map((i) => i.name));

  const fromOutputNames = new Set(from.outputs.map((o) => o.name));
  const toOutputNames = new Set(to.outputs.map((o) => o.name));

  return {
    fromVersion,
    toVersion,
    changelog: to.changelog,
    inputsAdded: [...toInputNames].filter((n) => !fromInputNames.has(n)),
    inputsRemoved: [...fromInputNames].filter((n) => !toInputNames.has(n)),
    outputsAdded: [...toOutputNames].filter((n) => !fromOutputNames.has(n)),
    outputsRemoved: [...fromOutputNames].filter((n) => !toOutputNames.has(n)),
  };
}

export async function checkForUpdates(
  blueprintSlug: string,
  currentVersion: string,
  workspaceId?: string
): Promise<{ available: boolean; latestVersion: string }> {
  const latest = await getLatestVersion(blueprintSlug, workspaceId);
  return {
    available: latest.version !== currentVersion,
    latestVersion: latest.version,
  };
}

