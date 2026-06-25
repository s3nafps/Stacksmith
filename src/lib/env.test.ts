import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('environment policy', () => {
  it('rejects demo auth in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXTAUTH_SECRET', 'x'.repeat(32));
    vi.stubEnv('ENCRYPTION_KEY', 'y'.repeat(32));
    vi.stubEnv('TOKEN_ENCRYPTION_KEY', '1'.repeat(64));
    vi.stubEnv('ENABLE_DEMO_AUTH', 'true');

    const { assertProductionEnv } = await import('./env');

    expect(() => assertProductionEnv()).toThrow(/ENABLE_DEMO_AUTH/);
  });

  it('rejects an all-zero token key in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXTAUTH_SECRET', 'x'.repeat(32));
    vi.stubEnv('ENCRYPTION_KEY', 'y'.repeat(32));
    vi.stubEnv('TOKEN_ENCRYPTION_KEY', '0'.repeat(64));

    const { assertProductionEnv } = await import('./env');

    expect(() => assertProductionEnv()).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });
});
