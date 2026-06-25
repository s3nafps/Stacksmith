import { env, isEnabled } from '@/lib/env';
import { BillingDisabledProvider } from './billing-disabled';
import { MockBillingProvider } from './billing-mock';
import type { BillingProvider } from './billing-provider';

export function getBillingProvider(): BillingProvider {
  if (isEnabled('ENABLE_MOCK_BILLING') && env.NODE_ENV !== 'production') {
    return new MockBillingProvider();
  }
  return new BillingDisabledProvider();
}

export { parseBillingPlan } from './billing-provider';
