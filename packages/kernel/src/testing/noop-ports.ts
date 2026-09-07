import type { AnalyticsSink } from "../ports/analytics.ts";
import type { FlagProvider } from "../ports/flags.ts";
import type { PaymentGateway } from "../ports/payment-gateway.ts";

export function createNoopFlagProvider(): FlagProvider {
  return {
    isEnabled() {
      return Promise.resolve(false);
    },
  };
}

export function createNoopAnalyticsSink(): AnalyticsSink {
  return {
    capture() {
      return Promise.resolve();
    },
  };
}

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
