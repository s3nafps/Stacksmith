import { AppError } from '@/lib/errors';
import type { BillingProvider } from './billing-provider';

export class PaddleBillingProvider implements BillingProvider {
  async checkout(): ReturnType<BillingProvider['checkout']> {
    throw new AppError('Paddle billing is not implemented in the open-source edition', 501, 'PADDLE_NOT_IMPLEMENTED');
  }
}
