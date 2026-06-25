import path from 'path';

const FORBIDDEN_SEGMENTS = ['..', '~', '\\\\', '\0'];
const FORBIDDEN_PATTERNS = [
  /\.\./,           // Parent directory traversal
  /^[/\\]/,         // Absolute paths
  /[<>:"|?*]/,      // Invalid path characters
  /\0/,             // Null bytes
];

/**
 * Validates that a path segment is safe to use as a directory or file name.
 * Prevents path traversal and injection attacks.
 */
export function isPathSegmentSafe(segment: string): boolean {
  if (!segment || segment.trim().length === 0) return false;
  if (segment.length > 255) return false;

  for (const forbidden of FORBIDDEN_SEGMENTS) {
    if (segment.includes(forbidden)) return false;
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(segment)) return false;
  }

  // Must not start with a dot (hidden files) unless explicitly allowed
  if (segment.startsWith('.') && segment !== '.infrapack.json') return false;

  return true;
}

/**
 * Validates a relative path (e.g., target directory) for safety.
 * All segments must be safe and the resolved path must stay within bounds.
 */
export function isRelativePathSafe(relativePath: string): boolean {
  if (!relativePath || relativePath.trim().length === 0) return false;

  // Normalize separators
  const normalized = relativePath.replace(/\\/g, '/');

  // Must not be absolute
  if (normalized.startsWith('/')) return false;

  // Split and check each segment
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) return false;

  for (const segment of segments) {
    if (segment === '..') return false;
    if (segment === '.') continue;
    if (segment.includes('\0')) return false;
    if (/[<>:"|?*]/.test(segment)) return false;
  }

  return true;
}

/**
 * Resolves a file path within a base directory, ensuring it doesn't escape.
 * Returns null if the resolved path would be outside the base directory.
 */
export function resolveSafePath(baseDir: string, ...segments: string[]): string | null {
  const resolved = path.resolve(baseDir, ...segments);
  const normalizedBase = path.resolve(baseDir);

  if (!resolved.startsWith(normalizedBase + path.sep) && resolved !== normalizedBase) {
    return null;
  }

  return resolved;
}

/**
 * Generates a safe branch name from components.
 */
export function generateBranchName(blueprintSlug: string, deploymentId: string): string {
  const safeBlueprintSlug = blueprintSlug
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);

  const safeId = deploymentId
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8);

  return `infrapack/${safeBlueprintSlug}/${safeId}`;
}
