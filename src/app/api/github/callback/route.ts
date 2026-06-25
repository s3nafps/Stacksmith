import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { encryptToken } from '@/lib/encryption';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const installationIdStr = searchParams.get('installation_id');

  if (!installationIdStr) {
    return NextResponse.json({ error: 'installation_id is required' }, { status: 400 });
  }

  const installationId = parseInt(installationIdStr, 10);
  if (isNaN(installationId)) {
    return NextResponse.json({ error: 'Invalid installation_id' }, { status: 400 });
  }

  try {
    // 1. Get or create user's GitHubConnection
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
    const mockPermissions = { metadata: 'read', contents: 'write', pull_requests: 'write' };

    let dbInstallation = await prisma.gitHubInstallation.findUnique({
      where: { installationId },
    });

    const targetLogin = `installed-org-${installationId}`;

    if (!dbInstallation) {
      dbInstallation = await prisma.gitHubInstallation.create({
        data: {
          connectionId: connection.id,
          installationId,
          targetType: 'Organization',
          targetLogin,
          permissions: mockPermissions as any,
        },
      });
    }

    // 3. Sync mock repositories for this installation
    const mockRepos = [
      {
        githubRepoId: Math.floor(Math.random() * 100000),
        fullName: `${targetLogin}/demo-service`,
        isPrivate: false,
        description: 'Web microservice generated via GitHub App onboarding',
        language: 'TypeScript',
        htmlUrl: `https://github.com/${targetLogin}/demo-service`,
      },
      {
        githubRepoId: Math.floor(Math.random() * 100000),
        fullName: `${targetLogin}/infra-configuration`,
        isPrivate: true,
        description: 'Infrastructure folder',
        language: 'HCL',
        htmlUrl: `https://github.com/${targetLogin}/infra-configuration`,
      },
    ];

    for (const repo of mockRepos) {
      await prisma.repository.upsert({
        where: { githubRepoId: repo.githubRepoId },
        create: {
          installationId: dbInstallation.id,
          githubRepoId: repo.githubRepoId,
          fullName: repo.fullName,
          isPrivate: repo.isPrivate,
          description: repo.description,
          language: repo.language,
          htmlUrl: repo.htmlUrl,
          defaultBranch: 'main',
        },
        update: {
          fullName: repo.fullName,
          isPrivate: repo.isPrivate,
          description: repo.description,
          language: repo.language,
        },
      });
    }

    return NextResponse.redirect(new URL('/connections?success=github-app', request.url));
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to complete GitHub App installation' },
      { status: 500 }
    );
  }
}
