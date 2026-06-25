export interface GitHubRepository {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string | null;
  language: string | null;
  htmlUrl: string;
}

export interface GitHubBranch {
  name: string;
  sha: string;
}

export interface GitHubPullRequest {
  number: number;
  url: string;
  htmlUrl: string;
  title: string;
  state: string;
  headBranch: string;
}

export interface CreatePRInput {
  repoFullName: string;
  title: string;
  body: string;
  headBranch: string;
  baseBranch: string;
  files: Array<{ path: string; content: string }>;
  commitMessage: string;
}

export interface GitHubProvider {
  getRepositories(accessToken: string, installationId?: number): Promise<GitHubRepository[]>;
  getRepository(accessToken: string, repoFullName: string): Promise<GitHubRepository>;
  getDefaultBranch(accessToken: string, repoFullName: string): Promise<GitHubBranch>;
  createBranch(accessToken: string, repoFullName: string, branchName: string, fromSha: string): Promise<GitHubBranch>;
  getFileContent(accessToken: string, repoFullName: string, filePath: string, ref?: string): Promise<string | null>;
  createPullRequest(accessToken: string, input: CreatePRInput): Promise<GitHubPullRequest>;
  branchExists(accessToken: string, repoFullName: string, branchName: string): Promise<boolean>;
}
