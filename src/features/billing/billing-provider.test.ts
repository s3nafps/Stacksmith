import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('billing provider', () => {
  it('uses the disabled provider by default', async () => {
    vi.stubEnv('ENABLE_MOCK_BILLING', 'false');

    const { getBillingProvider } = await import('./index');

    await expect(getBillingProvider().checkout('workspace-id', 'pro')).rejects.toThrow(
      /Billing is disabled/
    );
  });

  it('does not use mock billing in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ENABLE_MOCK_BILLING', 'true');

    const { getBillingProvider } = await import('./index');

    await expect(getBillingProvider().checkout('workspace-id', 'pro')).rejects.toThrow(
      /Billing is disabled/
    );
  });
});
