import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { errorJson } from '@/lib/api-response';
import { AppError } from '@/lib/errors';
import { checkWorkspacePermission } from '@/lib/rbac';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (process.env.ENABLE_MOCK_BILLING !== 'true') {
    return NextResponse.json(
      { error: 'Billing is not available yet' },
      { status: 503 }
    );
  }

  try {
    const { workspaceId, plan } = await request.json();

    if (!workspaceId || !plan) {
      throw new AppError('workspaceId and plan are required', 400);
    }

    if (!['free', 'pro', 'team', 'msp'].includes(plan)) {
      throw new AppError('Invalid plan. Allowed plans: free, pro, team, msp', 400);
    }

    // Must be OWNER or ADMIN of the workspace to manage billing
    await checkWorkspacePermission(session.user.id, workspaceId, 'ADMIN');

    // Simulate Paddle payment gateway latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Update database
    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        billingPlan: plan,
        subscriptionStatus: plan === 'free' ? 'inactive' : 'active',
        paddleCustomerId: plan === 'free' ? null : `pdl_mock_${workspaceId}`,
        paddleSubscriptionId: plan === 'free' ? null : `sub_mock_${workspaceId}`,
      },
    });

    return NextResponse.json({
      success: true,
      url: `/settings/billing?status=success&workspaceId=${workspaceId}`,
      workspace: updatedWorkspace,
    });
  } catch (error) {
    return errorJson(error, 'Checkout simulation failed');
  }
}
