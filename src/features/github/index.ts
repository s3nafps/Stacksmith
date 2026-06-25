import type { GitHubProvider } from '@/types/github';
import { env, isEnabled } from '@/lib/env';
import { MockGitHubProvider } from './github-mock';
import { RealGitHubProvider } from './github-service';

export function getGitHubProvider(): GitHubProvider {
  if (isEnabled('MOCK_GITHUB_API')) {
    if (env.NODE_ENV === 'production' && !isEnabled('ALLOW_DEMO_PRODUCTION')) {
      throw new Error('Mock GitHub provider is disabled in production');
    }
    return new MockGitHubProvider();
  }
  return new RealGitHubProvider();
}

export type { GitHubProvider } from '@/types/github';
