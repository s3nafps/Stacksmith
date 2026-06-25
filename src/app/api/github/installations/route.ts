import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { encryptToken } from '@/lib/encryption';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const orgName = body.orgName?.trim() || `mock-org-${Math.floor(Math.random() * 1000)}`;

    // 1. Resolve or create GitHubConnection for this user
    let connection = await prisma.gitHubConnection.findFirst({
      where: { userId: session.user.id },
    });

    if (!connection) {
      const mockToken = encryptToken('mock-github-access-token') || 'token';
      connection = await prisma.gitHubConnection.create({
        data: {
          userId: session.user.id,
          githubUserId: Math.floor(Math.random() * 100000),
          githubUsername: session.user.name || 'github-user',
          accessToken: mockToken,
          scopes: 'repo,read:org',
        },
      });
    }

    // 2. Create the GitHubInstallation record in the DB
    const installationId = Math.floor(100000 + Math.random() * 900000);
    const mockPermissions = { metadata: 'read', contents: 'write', pull_requests: 'write' };

    const dbInstallation = await prisma.gitHubInstallation.create({
      data: {
        connectionId: connection.id,
        installationId,
        targetType: 'Organization',
        targetLogin: orgName,
        permissions: mockPermissions as any,
      },
    });

    // 3. Sync mock repositories for this organization/installation
    const mockRepos = [
      {
        githubRepoId: Math.floor(Math.random() * 100000),
        fullName: `${orgName}/demo-service`,
        isPrivate: false,
        description: `[MOCK] Microservice repository for ${orgName}`,
        language: 'TypeScript',
        htmlUrl: `https://github.com/${orgName}/demo-service`,
      },
      {
        githubRepoId: Math.floor(Math.random() * 100000),
        fullName: `${orgName}/infra-configuration`,
        isPrivate: true,
        description: `[MOCK] Infrastructure configurations for ${orgName}`,
        language: 'HCL',
        htmlUrl: `https://github.com/${orgName}/infra-configuration`,
      },
    ];

    const createdRepos = [];
    for (const repo of mockRepos) {
      const dbRepo = await prisma.repository.create({
        data: {
          installationId: dbInstallation.id,
          githubRepoId: repo.githubRepoId,
          fullName: repo.fullName,
          isPrivate: repo.isPrivate,
          description: repo.description,
          language: repo.language,
          htmlUrl: repo.htmlUrl,
          defaultBranch: 'main',
        },
      });
      createdRepos.push(dbRepo);
    }

    return NextResponse.json({
      success: true,
      installation: dbInstallation,
      repositories: createdRepos,
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create mock installation' },
      { status: 500 }
    );
  }
}
