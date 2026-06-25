import { NextResponse } from 'next/server';
import { getActivity } from '@/features/deployments/deployment-service';
import { auth } from '@/auth';
import { errorJson } from '@/lib/api-response';
import { checkDeploymentPermission } from '@/lib/rbac';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await checkDeploymentPermission(session.user.id, id, 'VIEWER');
    const activity = await getActivity(id);
    return NextResponse.json(activity);
  } catch (error: unknown) {
    return errorJson(error, 'Failed to fetch activity logs');
  }
}

