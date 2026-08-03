import type { PaymentGateway } from "./types.ts";

/** No-op gateway for tests and apps without Stripe credentials. */
export function createNoopPaymentGateway(): PaymentGateway {
  return {
    listCatalogPrices() {
      return Promise.resolve([]);
    },
    createCustomer() {
      return Promise.reject(new Error("Payments are not configured"));
    },
    createCheckoutSession() {
      return Promise.reject(new Error("Payments are not configured"));
    },
    createBillingPortalSession() {
      return Promise.reject(new Error("Payments are not configured"));
    },
    constructWebhookEvent() {
      return undefined;
    },
    parseSubscriptionEvent() {
      return undefined;
    },
  };
}
