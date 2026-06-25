import { NextResponse } from 'next/server';
import { getGitHubProvider } from '@/features/github';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/encryption';
import { auth } from '@/auth';
import { errorJson } from '@/lib/api-response';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const connection = await prisma.gitHubConnection.findFirst({
      where: { userId: session.user.id },
    });

    if (!connection) {
      return NextResponse.json({ error: 'GitHub connection not found' }, { status: 404 });
    }

    // Query repositories from the DB linked to the user's connection installations
    const dbRepos = await prisma.repository.findMany({
      where: {
        installation: {
          connectionId: connection.id,
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const mappedRepos = dbRepos.map((r) => ({
      id: r.githubRepoId,
      fullName: r.fullName,
      name: r.fullName.split('/')[1] || r.fullName,
      owner: r.fullName.split('/')[0] || '',
      defaultBranch: r.defaultBranch,
      isPrivate: r.isPrivate,
      description: r.description,
      language: r.language,
      htmlUrl: r.htmlUrl,
    }));

    return NextResponse.json(mappedRepos);
  } catch (error: unknown) {
    return errorJson(error, 'Failed to fetch repositories');
  }
}
