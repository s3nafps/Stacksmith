import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: 'file:./test.db',
      NEXTAUTH_SECRET: 'dev-secret-change-in-production-min-32-chars-long',
      TOKEN_ENCRYPTION_KEY: '0000000000000000000000000000000000000000000000000000000000000000',
      ENCRYPTION_KEY: 'dev-secret-change-in-production-min-32-chars-long',
      ENABLE_DEMO_AUTH: 'true',
      ENABLE_RUNNER_SIMULATOR: 'true',
      MOCK_GITHUB_API: 'true',
      NEXT_PUBLIC_MOCK_GITHUB_API: 'true',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
