import type {
  GitHubProvider,
  GitHubRepository,
  GitHubBranch,
  GitHubPullRequest,
  CreatePRInput,
} from '@/types/github';

const MOCK_REPOS: GitHubRepository[] = [
  {
    id: 1001,
    fullName: 'mock-org/demo-app',
    name: 'demo-app',
    owner: 'mock-org',
    defaultBranch: 'main',
    isPrivate: false,
    description: '[MOCK] Demo application repository',
    language: 'TypeScript',
    htmlUrl: 'https://github.com/mock-org/demo-app',
  },
  {
    id: 1002,
    fullName: 'mock-org/infrastructure',
    name: 'infrastructure',
    owner: 'mock-org',
    defaultBranch: 'main',
    isPrivate: true,
    description: '[MOCK] Infrastructure-as-code repository',
    language: 'HCL',
    htmlUrl: 'https://github.com/mock-org/infrastructure',
  },
  {
    id: 1003,
    fullName: 'mock-org/platform-services',
    name: 'platform-services',
    owner: 'mock-org',
    defaultBranch: 'main',
    isPrivate: true,
    description: '[MOCK] Platform services and shared tooling',
    language: 'Go',
    htmlUrl: 'https://github.com/mock-org/platform-services',
  },
];

function mockSha(): string {
  const chars = '0123456789abcdef';
  let sha = '';
  for (let i = 0; i < 40; i++) {
    sha += chars[Math.floor(Math.random() * chars.length)];
  }
  return sha;
}

export class MockGitHubProvider implements GitHubProvider {
  private branches = new Map<string, GitHubBranch>();
  private fileStore = new Map<string, string>();
  private prCounter = 0;

  async getRepositories(
    _accessToken: string,
    _installationId?: number
  ): Promise<GitHubRepository[]> {
    void _accessToken;
    void _installationId;
    console.log('[MOCK_GITHUB] getRepositories called');
    return [...MOCK_REPOS];
  }

  async getRepository(
    _accessToken: string,
    repoFullName: string
  ): Promise<GitHubRepository> {
    console.log(`[MOCK_GITHUB] getRepository called for ${repoFullName}`);
    const repo = MOCK_REPOS.find((r) => r.fullName === repoFullName);
    if (!repo) {
      throw new Error(`[MOCK_GITHUB] Repository not found: ${repoFullName}`);
    }
    return { ...repo };
  }

  async getDefaultBranch(
    _accessToken: string,
    repoFullName: string
  ): Promise<GitHubBranch> {
    console.log(`[MOCK_GITHUB] getDefaultBranch called for ${repoFullName}`);
    const repo = MOCK_REPOS.find((r) => r.fullName === repoFullName);
    if (!repo) {
      throw new Error(`[MOCK_GITHUB] Repository not found: ${repoFullName}`);
    }
    return { name: repo.defaultBranch, sha: mockSha() };
  }

  async createBranch(
    _accessToken: string,
    repoFullName: string,
    branchName: string,
    fromSha: string
  ): Promise<GitHubBranch> {
    console.log(
      `[MOCK_GITHUB] createBranch: ${branchName} from ${fromSha.slice(0, 8)} in ${repoFullName}`
    );
    const branch: GitHubBranch = { name: branchName, sha: mockSha() };
    this.branches.set(`${repoFullName}:${branchName}`, branch);
    return branch;
  }

  async getFileContent(
    _accessToken: string,
    repoFullName: string,
    filePath: string,
    ref?: string
  ): Promise<string | null> {
    const key = `${repoFullName}:${ref ?? 'main'}:${filePath}`;
    console.log(`[MOCK_GITHUB] getFileContent: ${key}`);
    return this.fileStore.get(key) ?? null;
  }

  async createPullRequest(
    _accessToken: string,
    input: CreatePRInput
  ): Promise<GitHubPullRequest> {
    this.prCounter++;
    const prNumber = this.prCounter;

    console.log(`[MOCK_GITHUB] createPullRequest #${prNumber}:`);
    console.log(`  repo: ${input.repoFullName}`);
    console.log(`  title: ${input.title}`);
    console.log(`  head: ${input.headBranch} → base: ${input.baseBranch}`);
    console.log(`  files: ${input.files.length}`);
    for (const file of input.files) {
      console.log(`    - ${file.path} (${file.content.length} bytes)`);
    }

    // Store files in memory for future getFileContent calls
    for (const file of input.files) {
      this.fileStore.set(
        `${input.repoFullName}:${input.headBranch}:${file.path}`,
        file.content
      );
    }

    return {
      number: prNumber,
      url: `https://api.github.com/repos/${input.repoFullName}/pulls/${prNumber}`,
      htmlUrl: `https://github.com/${input.repoFullName}/pull/${prNumber}`,
      title: `[MOCK] ${input.title}`,
      state: 'open',
      headBranch: input.headBranch,
    };
  }

  async branchExists(
    _accessToken: string,
    repoFullName: string,
    branchName: string
  ): Promise<boolean> {
    const key = `${repoFullName}:${branchName}`;
    console.log(`[MOCK_GITHUB] branchExists: ${key}`);
    return this.branches.has(key);
  }
}
