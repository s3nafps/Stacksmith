import type { GitHubProvider } from '@/types/github';
import { MockGitHubProvider } from './github-mock';
import { RealGitHubProvider } from './github-service';

export function getGitHubProvider(): GitHubProvider {
  if (process.env.MOCK_GITHUB_API === 'true') {
    return new MockGitHubProvider();
  }
  return new RealGitHubProvider();
}

export type { GitHubProvider } from '@/types/github';
