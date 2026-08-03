/**
 * Payment gateway surface used by composition roots.
 *
 * Structurally matches `@repo/core` `PaymentGateway` — payments must not import core
 * (layer boundary).
 */

export type CatalogPrice = {
  stripePriceId: string;
  stripeProductId: string;
  productName: string;
  productDescription: string | undefined;
  currency: string;
  unitAmountMinor: number | undefined;
  interval: string | undefined;
  entitlementKeys: string[];
  active: boolean;
};

export type CreateCheckoutSessionInput = {
  organizationId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId: string | undefined;
  customerEmail: string | undefined;
};

export type CreateCheckoutSessionResult = {
  url: string;
  sessionId: string;
};

export type CreateBillingPortalSessionInput = {
  customerId: string;
  returnUrl: string;
};

export type CreateBillingPortalSessionResult = {
  url: string;
};

export type CreateCustomerInput = {
  organizationId: string;
  email: string | undefined;
  name: string | undefined;
};

export type CreateCustomerResult = {
  customerId: string;
};

export type PaymentWebhookEvent = {
  id: string;
  type: string;
  payloadJson: string;
};

export type ParsedSubscriptionEvent = {
  kind: "subscription_upsert" | "subscription_deleted";
  organizationId: string | undefined;
  stripeCustomerId: string | undefined;
  stripeSubscriptionId: string;
  stripePriceId: string;
  stripeProductId: string;
  status: string;
  currentPeriodStart: Date | undefined;
  currentPeriodEnd: Date | undefined;
  cancelAtPeriodEnd: boolean;
  entitlementKeys: string[];
};

export type PaymentGateway = {
  listCatalogPrices(): Promise<CatalogPrice[]>;
  createCustomer(input: CreateCustomerInput): Promise<CreateCustomerResult>;
  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionResult>;
  createBillingPortalSession(
    input: CreateBillingPortalSessionInput,
  ): Promise<CreateBillingPortalSessionResult>;
  constructWebhookEvent(input: {
    payload: string;
    signatureHeader: string | undefined;
    webhookSecret: string;
  }): PaymentWebhookEvent | undefined;
  parseSubscriptionEvent(payloadJson: string): ParsedSubscriptionEvent | undefined;
};
