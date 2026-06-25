import { describe, expect, it } from 'vitest';
import { loadAll } from './blueprint-loader';

describe('blueprint loader', () => {
  it('loads the on-disk catalog', async () => {
    const blueprints = await loadAll();

    expect(blueprints.length).toBeGreaterThanOrEqual(6);
    expect(blueprints.map((bp) => bp.slug)).toContain('aws-ecs-fargate');
    expect(blueprints.every((bp) => bp.versions.length > 0)).toBe(true);
  });
});
