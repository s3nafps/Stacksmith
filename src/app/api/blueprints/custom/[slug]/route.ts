import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { errorJson } from '@/lib/api-response';
import {
  updateCustomBlueprint,
  deleteCustomBlueprint,
  type CustomBlueprintInput,
} from '@/features/blueprints/custom-blueprint-service';
import { getBlueprint } from '@/features/blueprints/blueprint-service';
import { cookies } from 'next/headers';
import { checkWorkspacePermission } from '@/lib/rbac';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
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

    await checkWorkspacePermission(session.user.id, workspaceId, 'VIEWER');

    const { slug } = await params;
    const blueprint = await getBlueprint(slug, workspaceId);
    return NextResponse.json(blueprint);
  } catch (error: unknown) {
    return errorJson(error, 'Failed to fetch custom blueprint details');
  }
}


export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
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

    await checkWorkspacePermission(session.user.id, workspaceId, 'OPERATOR');

    const { slug } = await params;
    const body = (await request.json()) as CustomBlueprintInput;
    const blueprint = await updateCustomBlueprint(slug, body, session.user.id, workspaceId);
    return NextResponse.json(blueprint);
  } catch (error: unknown) {
    return errorJson(error, 'Failed to update custom blueprint');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
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

    await checkWorkspacePermission(session.user.id, workspaceId, 'OPERATOR');

    const { slug } = await params;
    const result = await deleteCustomBlueprint(slug, session.user.id, workspaceId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return errorJson(error, 'Failed to delete custom blueprint');
  }
}
