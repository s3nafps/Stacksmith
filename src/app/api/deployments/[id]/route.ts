import { NextResponse } from 'next/server';
import { getDeployment, updateInputs } from '@/features/deployments/deployment-service';
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
    const deployment = await getDeployment(id);
    const redactedInputs = deployment.inputs.map(input => ({
      key: input.key,
      value: input.isSensitive ? '[REDACTED]' : input.value,
      isSensitive: input.isSensitive,
    }));
    return NextResponse.json({
      ...deployment,
      inputs: redactedInputs,
    });
  } catch (error: unknown) {
    return errorJson(error, 'Deployment not found', 404);
  }
}

export async function PATCH(
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
    const body = await request.json();
    await updateInputs(id, body.inputs);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return errorJson(error, 'Failed to update deployment inputs');
  }
}

