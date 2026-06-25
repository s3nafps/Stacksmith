import { AppError } from '@/lib/errors';
import type { BillingProvider } from './billing-provider';

export class BillingDisabledProvider implements BillingProvider {
  async checkout(): ReturnType<BillingProvider['checkout']> {
    throw new AppError('Billing is disabled in the self-hosted edition', 503, 'BILLING_DISABLED');
  }
}
