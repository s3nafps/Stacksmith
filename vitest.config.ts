import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: 'file:./test.db',
      NEXTAUTH_SECRET: 'dev-secret-change-in-production-min-32-chars-long',
      TOKEN_ENCRYPTION_KEY: '0000000000000000000000000000000000000000000000000000000000000000',
      ENCRYPTION_KEY: 'dev-secret-change-in-production-min-32-chars-long',
      MOCK_GITHUB: 'true',
      NEXT_PUBLIC_MOCK_GITHUB: 'true',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});

