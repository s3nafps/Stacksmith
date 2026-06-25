import type { FileManifest, GeneratedFile } from '@/types/deployment';

const MANIFEST_FILENAME = '.infrapack.json';
const GENERATOR_VERSION = '1.0.0';

/**
 * Creates a new .infrapack.json manifest file.
 */
export function createManifest(params: {
  blueprintSlug: string;
  blueprintVersion: string;
  deploymentId: string;
  managedFiles: string[];
}): GeneratedFile {
  const manifest: FileManifest = {
    blueprintSlug: params.blueprintSlug,
    blueprintVersion: params.blueprintVersion,
    generatorVersion: GENERATOR_VERSION,
    deploymentId: params.deploymentId,
    generatedAt: new Date().toISOString(),
    managedFiles: params.managedFiles.sort(),
  };

  return {
    path: MANIFEST_FILENAME,
    content: JSON.stringify(manifest, null, 2) + '\n',
  };
}

/**
 * Parses a .infrapack.json manifest from its content string.
 */
export function parseManifest(content: string): FileManifest {
  const raw = JSON.parse(content) as FileManifest;

  if (!raw.blueprintSlug || !raw.deploymentId || !Array.isArray(raw.managedFiles)) {
    throw new Error('Invalid manifest format: missing required fields');
  }

  return raw;
}

/**
 * Detects conflicts between two manifests by comparing managed file lists.
 */
export function compareManifests(
  oldManifest: FileManifest,
  newManifest: FileManifest
): { added: string[]; removed: string[]; unchanged: string[] } {
  const oldFiles = new Set(oldManifest.managedFiles);
  const newFiles = new Set(newManifest.managedFiles);

  const added = [...newFiles].filter((f) => !oldFiles.has(f));
  const removed = [...oldFiles].filter((f) => !newFiles.has(f));
  const unchanged = [...newFiles].filter((f) => oldFiles.has(f));

  return { added, removed, unchanged };
}

export function getManifestFilename(): string {
  return MANIFEST_FILENAME;
}

export function getGeneratorVersion(): string {
  return GENERATOR_VERSION;
}
