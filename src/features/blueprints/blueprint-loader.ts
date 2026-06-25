import fs from 'fs/promises';
import path from 'path';
import {
  BlueprintMetadataSchema,
  type BlueprintMetadata,
  type BlueprintVersion,
} from '@/types/blueprint';
import { NotFoundError } from '@/lib/errors';

const BLUEPRINTS_DIR = path.resolve(process.cwd(), 'blueprints');

async function readCatalog(): Promise<Map<string, BlueprintMetadata>> {
  const catalog = new Map<string, BlueprintMetadata>();

  let entries: string[];
  try {
    entries = await fs.readdir(BLUEPRINTS_DIR);
  } catch {
    console.warn(`[blueprint-loader] Blueprints directory not found: ${BLUEPRINTS_DIR}`);
    return catalog;
  }

  const blueprintDirs: string[] = [];
  for (const entry of entries) {
    if (entry === 'custom') {
      const customDir = path.join(BLUEPRINTS_DIR, entry);
      const customEntries = await fs.readdir(customDir).catch(() => []);
      for (const customEntry of customEntries) {
        blueprintDirs.push(path.join(entry, customEntry));
      }
    } else {
      blueprintDirs.push(entry);
    }
  }

  for (const entry of blueprintDirs) {
    const blueprintJsonPath = path.join(BLUEPRINTS_DIR, entry, 'blueprint.json');

    try {
      const exists = await fs.stat(blueprintJsonPath).then(() => true).catch(() => false);
      if (!exists) continue;

      const raw = await fs.readFile(blueprintJsonPath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;

      // Normalise the on-disk format: blueprint.json may use plain-string
      // options arrays (e.g. ["dev","staging","production"]) rather than
      // the {label,value} shape the Zod schema expects.  Coerce them here
      // so validation passes without requiring every blueprint author to
      // use the verbose format.
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        'versions' in parsed &&
        Array.isArray((parsed as Record<string, unknown>).versions)
      ) {
        for (const ver of (parsed as Record<string, unknown>).versions as Record<string, unknown>[]) {
          if (Array.isArray(ver.inputs)) {
            for (const inp of ver.inputs as Record<string, unknown>[]) {
              if (Array.isArray(inp.options)) {
                inp.options = (inp.options as unknown[]).map((opt) => {
                  if (typeof opt === 'string') {
                    return { label: opt, value: opt };
                  }
                  return opt;
                });
              }
            }
          }
        }
      }

      const metadata = BlueprintMetadataSchema.parse(parsed);
      catalog.set(metadata.slug, metadata);
    } catch (err) {
      console.error(
        `[blueprint-loader] Failed to load blueprint from ${blueprintJsonPath}:`,
        err
      );
    }
  }

  return catalog;
}

export async function loadAll(): Promise<BlueprintMetadata[]> {
  const c = await readCatalog();
  return Array.from(c.values());
}

export async function loadBySlug(slug: string): Promise<BlueprintMetadata> {
  const c = await readCatalog();
  const bp = c.get(slug);
  if (!bp) {
    throw new NotFoundError('Blueprint', slug);
  }
  return bp;
}

export async function getLatestVersion(
  slug: string
): Promise<BlueprintVersion> {
  const bp = await loadBySlug(slug);
  // Versions are listed in the JSON in order; last entry is latest
  const latest = bp.versions[bp.versions.length - 1];
  return latest;
}

export function invalidateCache(): void {
  // Kept for callers; catalog reads are intentionally uncached.
}

export function getBlueprintsDir(): string {
  return BLUEPRINTS_DIR;
}
