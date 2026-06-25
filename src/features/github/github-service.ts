import type {
  GitHubProvider,
  GitHubRepository,
  GitHubBranch,
  GitHubPullRequest,
  CreatePRInput,
} from '@/types/github';

const GITHUB_API = 'https://api.github.com';

function headers(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function toRepository(raw: Record<string, unknown>): GitHubRepository {
  const owner = raw.owner as Record<string, unknown>;
  return {
    id: raw.id as number,
    fullName: raw.full_name as string,
    name: raw.name as string,
    owner: (owner?.login as string) ?? '',
    defaultBranch: (raw.default_branch as string) ?? 'main',
    isPrivate: (raw.private as boolean) ?? false,
    description: (raw.description as string) ?? null,
    language: (raw.language as string) ?? null,
    htmlUrl: raw.html_url as string,
  };
}

async function ghFetch<T>(
  url: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { ...headers(accessToken), ...(options.headers ?? {}) },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `GitHub API error ${res.status} ${res.statusText}: ${body}`
    );
  }

  return res.json() as Promise<T>;
}

export class RealGitHubProvider implements GitHubProvider {
  async getRepositories(
    accessToken: string,
    _installationId?: number
  ): Promise<GitHubRepository[]> {
    void _installationId;
    // Paginate through all user repos (up to 100 per page)
    const repos: GitHubRepository[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const raw = await ghFetch<Record<string, unknown>[]>(
        `${GITHUB_API}/user/repos?per_page=${perPage}&page=${page}&sort=updated`,
        accessToken
      );

      for (const r of raw) {
        repos.push(toRepository(r));
      }

      if (raw.length < perPage) break;
      page++;
      // Safety cap at 10 pages (1000 repos)
      if (page > 10) break;
    }

    return repos;
  }

  async getRepository(
    accessToken: string,
    repoFullName: string
  ): Promise<GitHubRepository> {
    const raw = await ghFetch<Record<string, unknown>>(
      `${GITHUB_API}/repos/${repoFullName}`,
      accessToken
    );
    return toRepository(raw);
  }

  async getDefaultBranch(
    accessToken: string,
    repoFullName: string
  ): Promise<GitHubBranch> {
    const repo = await this.getRepository(accessToken, repoFullName);
    const ref = await ghFetch<Record<string, unknown>>(
      `${GITHUB_API}/repos/${repoFullName}/git/ref/heads/${repo.defaultBranch}`,
      accessToken
    );
    const obj = ref.object as Record<string, unknown>;
    return {
      name: repo.defaultBranch,
      sha: obj.sha as string,
    };
  }

  async createBranch(
    accessToken: string,
    repoFullName: string,
    branchName: string,
    fromSha: string
  ): Promise<GitHubBranch> {
    const ref = await ghFetch<Record<string, unknown>>(
      `${GITHUB_API}/repos/${repoFullName}/git/refs`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: fromSha,
        }),
      }
    );
    const obj = ref.object as Record<string, unknown>;
    return {
      name: branchName,
      sha: obj.sha as string,
    };
  }

  async getFileContent(
    accessToken: string,
    repoFullName: string,
    filePath: string,
    ref?: string
  ): Promise<string | null> {
    const url = ref
      ? `${GITHUB_API}/repos/${repoFullName}/contents/${filePath}?ref=${ref}`
      : `${GITHUB_API}/repos/${repoFullName}/contents/${filePath}`;

    try {
      const raw = await ghFetch<Record<string, unknown>>(url, accessToken);
      if (raw.encoding === 'base64' && typeof raw.content === 'string') {
        return Buffer.from(raw.content, 'base64').toString('utf-8');
      }
      return (raw.content as string) ?? null;
    } catch {
      // File not found returns 404
      return null;
    }
  }

  async createPullRequest(
    accessToken: string,
    input: CreatePRInput
  ): Promise<GitHubPullRequest> {
    // Step 1: Get the base branch SHA
    const baseBranch = await this.getDefaultBranch(accessToken, input.repoFullName);

    // Step 2: Create the head branch
    await this.createBranch(
      accessToken,
      input.repoFullName,
      input.headBranch,
      baseBranch.sha
    );

    // Step 3: Create/update files via the Contents API
    for (const file of input.files) {
      // Check if file exists to get its SHA for update
      const existingUrl = `${GITHUB_API}/repos/${input.repoFullName}/contents/${file.path}?ref=${input.headBranch}`;
      let existingSha: string | undefined;

      try {
        const existing = await ghFetch<Record<string, unknown>>(
          existingUrl,
          accessToken
        );
        existingSha = existing.sha as string;
      } catch {
        // File doesn't exist yet, which is fine
      }

      const body: Record<string, unknown> = {
        message: input.commitMessage,
        content: Buffer.from(file.content, 'utf-8').toString('base64'),
        branch: input.headBranch,
      };
      if (existingSha) {
        body.sha = existingSha;
      }

      await ghFetch(
        `${GITHUB_API}/repos/${input.repoFullName}/contents/${file.path}`,
        accessToken,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        }
      );
    }

    // Step 4: Create the pull request
    const pr = await ghFetch<Record<string, unknown>>(
      `${GITHUB_API}/repos/${input.repoFullName}/pulls`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          title: input.title,
          body: input.body,
          head: input.headBranch,
          base: input.baseBranch,
        }),
      }
    );

    const head = pr.head as Record<string, unknown>;
    return {
      number: pr.number as number,
      url: pr.url as string,
      htmlUrl: pr.html_url as string,
      title: pr.title as string,
      state: pr.state as string,
      headBranch: head.ref as string,
    };
  }

  async branchExists(
    accessToken: string,
    repoFullName: string,
    branchName: string
  ): Promise<boolean> {
    try {
      await ghFetch(
        `${GITHUB_API}/repos/${repoFullName}/git/ref/heads/${branchName}`,
        accessToken
      );
      return true;
    } catch {
      return false;
    }
  }
}
