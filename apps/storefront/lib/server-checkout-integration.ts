import type { ApiClientConfig } from './api-config';
import { createCatalogApiClient } from './catalog-api-client';
import { createServerAuthClient } from './server-auth-client';
import { createServerCartClient } from './server-cart-client';
import { createCheckoutBusinessClient } from './checkout-business-client';
import { createPromotionPricingClient } from './promotion-pricing-client';
import { createShippingBusinessClient } from './shipping-business-client';
import { createPaymentBusinessClient } from './payment-business-client';
/** Explicit opt-in integration controller. Never selected by the storefront's demo providers.
 * CSRF lives only in this closure; browser cookies remain HttpOnly/server managed.
 */
export function createServerCheckoutIntegrationClients(
  catalogConfig: ApiClientConfig,
  transport: typeof fetch = fetch,
) {
  const identity = createServerAuthClient(transport);
  let csrf = '';
  const capture = async <T extends { csrfToken: string }>(
    run: () => Promise<T>,
  ) => {
    const result = await run();
    csrf = result.csrfToken;
    return result;
  };
  const auth = {
    bootstrap: () => capture(() => identity.bootstrap()),
    start: identity.start,
    verify: (input: Parameters<typeof identity.verify>[0]) =>
      capture(() => identity.verify(input)),
    getSession: () => capture(() => identity.getSession()),
    getCurrentUser: identity.getCurrentUser,
    async logout(all = false) {
      const result = await identity.logout(all);
      csrf = '';
      return result;
    },
  };
  const cart = createServerCartClient(() => csrf, transport),
    checkout = createCheckoutBusinessClient(() => csrf, transport);
  return {
    auth,
    cart,
    checkout,
    catalog: createCatalogApiClient(catalogConfig, transport),
    promotions: createPromotionPricingClient(() => csrf, transport),
    shipping: createShippingBusinessClient(() => csrf, transport),
    payments: createPaymentBusinessClient(() => csrf, transport),
    async startCurrentCheckout(idempotencyKey: string) {
      const current = await cart.get();
      if (!current.canCheckout)
        throw new Error('Серверний кошик потребує перевірки товарів.');
      return checkout.start({
        cartId: current.cart.id,
        expectedCartVersion: current.cart.version,
        idempotencyKey,
      });
    },
  };
}
