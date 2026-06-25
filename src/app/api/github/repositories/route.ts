import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { errorJson } from '@/lib/api-response';

import { cookies } from 'next/headers';
import { checkWorkspacePermission } from '@/lib/rbac';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cookieStore = await cookies();
    const workspaceId = cookieStore.get('activeWorkspaceId')?.value;

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    // Verify user membership in this workspace
    await checkWorkspacePermission(session.user.id, workspaceId, 'VIEWER');

    // Query repositories from the DB linked to the active workspace
    const dbRepos = await prisma.repository.findMany({
      where: {
        workspaceId,
        installation: {
          connection: {
            userId: session.user.id,
          },
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
