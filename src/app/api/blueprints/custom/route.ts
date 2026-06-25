import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { errorJson } from '@/lib/api-response';
import { createCustomBlueprint, type CustomBlueprintInput } from '@/features/blueprints/custom-blueprint-service';

import { cookies } from 'next/headers';
import { checkWorkspacePermission } from '@/lib/rbac';

export async function POST(request: Request) {
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

    // Verify workspace access (minimum role: OPERATOR to create custom blueprints)
    await checkWorkspacePermission(session.user.id, workspaceId, 'OPERATOR');

    const body = await request.json() as CustomBlueprintInput;
    const blueprint = await createCustomBlueprint(body, session.user.id, workspaceId);
    return NextResponse.json(blueprint, { status: 201 });
  } catch (error: unknown) {
    return errorJson(error, 'Failed to create custom blueprint');
  }
}
