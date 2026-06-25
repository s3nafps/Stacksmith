import { NextResponse } from 'next/server';
import { createDraft, listDeployments } from '@/features/deployments/deployment-service';
import { auth } from '@/auth';
import { errorJson } from '@/lib/api-response';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const cookieStore = await cookies();
    const workspaceId = searchParams.get('workspaceId') || cookieStore.get('activeWorkspaceId')?.value;

    const deployments = await listDeployments(session.user.id, workspaceId);
    return NextResponse.json(deployments);
  } catch (error: unknown) {
    return errorJson(error, 'Failed to list deployments');
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // Inject active workspace ID if not provided in payload
    if (!body.workspaceId) {
      const cookieStore = await cookies();
      const workspaceId = cookieStore.get('activeWorkspaceId')?.value;
      if (workspaceId) {
        body.workspaceId = workspaceId;
      }
    }

    const deploymentId = await createDraft(session.user.id, body);
    return NextResponse.json({ id: deploymentId }, { status: 201 });
  } catch (error: unknown) {
    return errorJson(error, 'Failed to create deployment');
  }
}

