import { NextResponse } from 'next/server';
import { createPullRequest } from '@/features/deployments/deployment-service';
import { auth } from '@/auth';
import { errorJson } from '@/lib/api-response';
import { checkDeploymentPermission } from '@/lib/rbac';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await checkDeploymentPermission(session.user.id, id, 'OPERATOR');
    const result = await createPullRequest(id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return errorJson(error, 'Failed to create pull request');
  }
}

