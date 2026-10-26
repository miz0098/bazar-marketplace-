import type pg from 'pg';
import { createAuthService } from '../auth/service.js';
import type { AuthConfig } from '../auth/config.js';
import type { SmsAdapter } from '../auth/sms.js';
import { createCatalog } from '../business/catalog.js';
import { createCurrentCartService } from '../cart/service.js';
import { createCheckoutBusinessService } from '../checkout/service.js';
import { createPromotionService } from '../promotions/service.js';
import {
  createShippingService,
  type ShippingTestConfig,
} from '../shipping/service.js';
import type { ShippingAdapter } from '../shipping/adapter.js';
import {
  createPaymentService,
  type PaymentTestConfig,
} from '../payments/service.js';
import type { PaymentAdapter } from '../payments/adapter.js';
/** Explicit composition for integration tests only. Main never constructs this graph or chooses these adapters. */
export function createCheckoutIntegrationServices(
  pool: pg.Pool,
  input: {
    auth: AuthConfig;
    sms: SmsAdapter;
    shipping: readonly ShippingAdapter[];
    shippingConfig: ShippingTestConfig;
    payment: PaymentAdapter;
    paymentConfig: PaymentTestConfig;
    isReady: () => boolean | Promise<boolean>;
  },
) {
  if (process.env.NODE_ENV !== 'test')
    throw new Error(
      'Checkout composition requires an isolated integration process',
    );
  const auth = createAuthService(pool, input.auth, input.sms),
    shipping = createShippingService(
      pool,
      input.shipping,
      input.shippingConfig,
    ),
    payments = createPaymentService(
      pool,
      input.payment,
      input.paymentConfig,
      shipping,
    );
  return {
    auth,
    shipping,
    payments,
    currentCart: createCurrentCartService(pool),
    catalog: createCatalog(pool),
    promotions: createPromotionService(pool),
    checkout: createCheckoutBusinessService(pool, shipping, payments),
    isReady: input.isReady,
  };
}
