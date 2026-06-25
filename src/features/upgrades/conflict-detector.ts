import type { FileManifest } from '@/types/deployment';

export interface ConflictEntry {
  filePath: string;
  type: 'modified' | 'deleted' | 'added';
  description: string;
}

/**
 * Compares the old manifest's managed files against the current files
 * that actually exist in the repository to detect manual modifications.
 *
 * @param oldManifest - The manifest from the last Stacksmith generation.
 * @param currentFiles - Map of file paths to their current content hashes (or null if deleted).
 * @param originalHashes - Map of file paths to the content hashes at generation time.
 */
export function compareManifests(
  oldManifest: FileManifest,
  currentFiles: Map<string, string | null>,
  originalHashes?: Map<string, string>
): ConflictEntry[] {
  const conflicts: ConflictEntry[] = [];

  for (const managedFile of oldManifest.managedFiles) {
    const currentContent = currentFiles.get(managedFile);

    if (currentContent === null || currentContent === undefined) {
      // File was deleted from the repo
      conflicts.push({
        filePath: managedFile,
        type: 'deleted',
        description: `Managed file "${managedFile}" was deleted from the repository`,
      });
    } else if (originalHashes) {
      const originalHash = originalHashes.get(managedFile);
      if (originalHash && currentContent !== originalHash) {
        conflicts.push({
          filePath: managedFile,
          type: 'modified',
          description: `Managed file "${managedFile}" was manually modified`,
        });
      }
    }
  }

  // Check for files added in the target directory that aren't in the manifest
  for (const [filePath] of currentFiles) {
    if (
      !oldManifest.managedFiles.includes(filePath) &&
      !['.stacksmith.json', '.infrapack.json'].some((name) => filePath.endsWith(name))
    ) {
      // Only flag files that share the same base directory as managed files
      const managedDirs = new Set(
        oldManifest.managedFiles.map((f) => {
          const parts = f.split('/');
          return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
        })
      );

      const fileDir = filePath.split('/').slice(0, -1).join('/');
      if (managedDirs.has(fileDir)) {
        conflicts.push({
          filePath,
          type: 'added',
          description: `File "${filePath}" was added in a managed directory`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Utility: creates a simple hash of a string for comparison purposes.
 * Uses a fast non-cryptographic approach for conflict detection.
 */
export function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}
