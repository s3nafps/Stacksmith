import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { errorJson } from '@/lib/api-response';
import { AppError } from '@/lib/errors';
import { checkWorkspacePermission } from '@/lib/rbac';
import { getBillingProvider, parseBillingPlan } from '@/features/billing';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { workspaceId, plan } = await request.json();
    const billingPlan = parseBillingPlan(plan);

    if (!workspaceId || !billingPlan) {
      throw new AppError('workspaceId and plan are required', 400);
    }

    await checkWorkspacePermission(session.user.id, workspaceId, 'ADMIN');

    const result = await getBillingProvider().checkout(workspaceId, billingPlan);

    return NextResponse.json({
      success: true,
      url: result.url,
      workspace: result.workspace,
    });
  } catch (error) {
    return errorJson(error, 'Checkout simulation failed');
  }
}
