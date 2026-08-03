/**
 * Payments port — Stripe stays behind `@repo/payments`.
 *
 * Core never imports the Stripe SDK. Composition roots adapt the adapter to
 * this shape.
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

/** Normalized webhook event after signature verification (no Stripe types). */
export type PaymentWebhookEvent = {
  id: string;
  type: string;
  /** Opaque JSON payload for the worker to interpret via `@repo/payments`. */
  payloadJson: string;
};

export type PaymentGateway = {
  listCatalogPrices(): Promise<CatalogPrice[]>;
  createCustomer(input: CreateCustomerInput): Promise<CreateCustomerResult>;
  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionResult>;
  createBillingPortalSession(
    input: CreateBillingPortalSessionInput,
  ): Promise<CreateBillingPortalSessionResult>;
  /**
   * Verify signature and return a normalized event, or `undefined` if invalid.
   */
  constructWebhookEvent(input: {
    payload: string;
    signatureHeader: string | undefined;
    webhookSecret: string;
  }): PaymentWebhookEvent | undefined;
  /** Parse a stored payload into domain-friendly subscription fields. */
  parseSubscriptionEvent(payloadJson: string): ParsedSubscriptionEvent | undefined;
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
