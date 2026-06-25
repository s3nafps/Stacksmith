import { z } from 'zod';

const bool = z.enum(['true', 'false']).optional();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1).default('file:./dev.db'),
  NEXTAUTH_SECRET: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  ENABLE_DEMO_AUTH: bool,
  NEXT_PUBLIC_ENABLE_DEMO_AUTH: bool,
  ENABLE_RUNNER_SIMULATOR: bool,
  MOCK_GITHUB_API: bool,
  NEXT_PUBLIC_MOCK_GITHUB_API: bool,
  ENABLE_MOCK_BILLING: bool,
  ALLOW_DEMO_PRODUCTION: bool,
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);

export function isEnabled(name: keyof typeof env): boolean {
  return env[name] === 'true';
}

export function assertProductionEnv() {
  if (env.NODE_ENV !== 'production') return;

  const errors: string[] = [];
  if (!env.NEXTAUTH_SECRET || env.NEXTAUTH_SECRET.length < 32) {
    errors.push('NEXTAUTH_SECRET must be at least 32 characters in production');
  }
  if (!env.ENCRYPTION_KEY || env.ENCRYPTION_KEY.length < 32) {
    errors.push('ENCRYPTION_KEY must be at least 32 characters in production');
  }
  if (!env.TOKEN_ENCRYPTION_KEY || !/^[a-f0-9]{64}$/i.test(env.TOKEN_ENCRYPTION_KEY) || /^0+$/.test(env.TOKEN_ENCRYPTION_KEY)) {
    errors.push('TOKEN_ENCRYPTION_KEY must be a non-zero 64-character hex key in production');
  }
  if (isEnabled('ENABLE_DEMO_AUTH')) errors.push('ENABLE_DEMO_AUTH cannot be true in production');
  if (isEnabled('ENABLE_MOCK_BILLING')) errors.push('ENABLE_MOCK_BILLING cannot be true in production');
  if (isEnabled('ENABLE_RUNNER_SIMULATOR')) errors.push('ENABLE_RUNNER_SIMULATOR cannot be true in production');
  if (isEnabled('MOCK_GITHUB_API') && !isEnabled('ALLOW_DEMO_PRODUCTION')) {
    errors.push('MOCK_GITHUB_API cannot be true in production unless ALLOW_DEMO_PRODUCTION is true');
  }

  if (errors.length) throw new Error(`Invalid production environment:\n- ${errors.join('\n- ')}`);
}
