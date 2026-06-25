import { prisma } from '@/lib/prisma';
import type { BillingPlan, BillingProvider } from './billing-provider';

export class MockBillingProvider implements BillingProvider {
  async checkout(workspaceId: string, plan: BillingPlan) {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        billingPlan: plan,
        subscriptionStatus: plan === 'free' ? 'inactive' : 'active',
        paddleCustomerId: plan === 'free' ? null : `pdl_mock_${workspaceId}`,
        paddleSubscriptionId: plan === 'free' ? null : `sub_mock_${workspaceId}`,
      },
    });

    return {
      url: `/settings/billing?status=success&workspaceId=${workspaceId}`,
      workspace,
    };
  }
}
