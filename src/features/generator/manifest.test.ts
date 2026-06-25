import { describe, expect, it } from 'vitest';
import {
  createManifest,
  getLegacyManifestFilename,
  getManifestFilename,
  parseManifest,
} from './manifest';

describe('manifest compatibility', () => {
  it('creates new Stacksmith manifests', () => {
    const file = createManifest({
      blueprintSlug: 'aws-example',
      blueprintVersion: '1.0.0',
      deploymentId: 'dep-1',
      managedFiles: ['infra/main.tf'],
    });

    expect(file.path).toBe('.stacksmith.json');
    expect(getManifestFilename()).toBe('.stacksmith.json');
    expect(getLegacyManifestFilename()).toBe('.infrapack.json');
  });

  it('parses legacy InfraPack manifest content', () => {
    const manifest = parseManifest(JSON.stringify({
      blueprintSlug: 'aws-example',
      blueprintVersion: '1.0.0',
      generatorVersion: '1.0.0',
      deploymentId: 'dep-1',
      generatedAt: '2026-01-01T00:00:00.000Z',
      managedFiles: ['infra/.infrapack.json', 'infra/main.tf'],
    }));

    expect(manifest.deploymentId).toBe('dep-1');
    expect(manifest.managedFiles).toContain('infra/.infrapack.json');
  });
});
