import { NextResponse } from 'next/server';
import { listBlueprints } from '@/features/blueprints/blueprint-service';
import { auth } from '@/auth';
import { errorJson } from '@/lib/api-response';
import type { BlueprintFilter } from '@/features/blueprints/blueprint-service';
import { cookies } from 'next/headers';
import { checkWorkspacePermission } from '@/lib/rbac';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const difficulty = searchParams.get('difficulty') as BlueprintFilter['difficulty'] | null;
  const search = searchParams.get('search') || undefined;
  const tagsParam = searchParams.get('tags');
  const tags = tagsParam ? tagsParam.split(',') : undefined;

  try {
    const cookieStore = await cookies();
    const workspaceId = cookieStore.get('activeWorkspaceId')?.value;
    
    if (workspaceId) {
      await checkWorkspacePermission(userId, workspaceId, 'VIEWER');
    }

    const blueprints = await listBlueprints({
      category,
      difficulty: difficulty || undefined,
      search,
      tags,
      userId,
      workspaceId,
    });

    const redactedBlueprints = blueprints.map((bp) => ({
      ...bp,
      versions: bp.versions.map((v) => {
        const { files, ...rest } = v;
        return rest;
      }),
    }));

    return NextResponse.json(redactedBlueprints);
  } catch (error: unknown) {
    return errorJson(error, 'Failed to list blueprints');
  }
}

