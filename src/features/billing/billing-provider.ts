import type { Workspace } from '@prisma/client';

export type BillingPlan = 'free' | 'pro' | 'team' | 'msp';

export interface BillingProvider {
  checkout(workspaceId: string, plan: BillingPlan): Promise<{
    url: string;
    workspace: Workspace;
  }>;
}

export function parseBillingPlan(plan: unknown): BillingPlan | null {
  return typeof plan === 'string' && ['free', 'pro', 'team', 'msp'].includes(plan)
    ? (plan as BillingPlan)
    : null;
}
