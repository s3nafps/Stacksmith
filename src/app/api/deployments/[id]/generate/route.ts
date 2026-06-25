import { NextResponse } from 'next/server';
import { generateDeployment, previewDeploymentFiles } from '@/features/deployments/deployment-service';
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
    const files = await previewDeploymentFiles(id);
    return NextResponse.json({ files });
  } catch (error: unknown) {
    return errorJson(error, 'Failed to preview generated files');
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
    const files = await generateDeployment(id);
    return NextResponse.json({ success: true, files });
  } catch (error: unknown) {
    return errorJson(error, 'Failed to generate files');
  }
}

