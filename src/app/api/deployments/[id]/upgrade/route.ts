import { NextResponse } from 'next/server';
import { getUpgradeDetails, startUpgrade } from '@/features/upgrades/upgrade-service';
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
    const details = await getUpgradeDetails(id);
    return NextResponse.json(details);
  } catch (error: unknown) {
    return errorJson(error, 'Failed to fetch upgrade details');
  }
}

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
    await startUpgrade(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return errorJson(error, 'Failed to start upgrade');
  }
}

