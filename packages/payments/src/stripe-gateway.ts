/**
 * Stripe PaymentGateway adapter.
 */

import { randomBytes } from "node:crypto";

import Stripe from "stripe";

import { entitlementKeysFromMetadata } from "./entitlements.ts";
import { parseStripeSubscription } from "./parse-subscription.ts";
import type {
  CatalogPrice,
  PaymentGateway,
  PaymentWebhookEvent,
  ParsedSubscriptionEvent,
} from "./types.ts";

export type CreateStripePaymentGatewayOptions = {
  secretKey: string;
};

function integrationIdentifier(): string {
  return `repo-checkout-${randomBytes(4).toString("hex")}`;
}

export function createStripePaymentGateway(
  options: CreateStripePaymentGatewayOptions,
): PaymentGateway {
  const stripe = new Stripe(options.secretKey, {
    typescript: true,
  });

  return {
    async listCatalogPrices(): Promise<CatalogPrice[]> {
      const prices = await stripe.prices.list({
        active: true,
        expand: ["data.product"],
        limit: 100,
      });

      const out: CatalogPrice[] = [];
      for (const price of prices.data) {
        const product = price.product;
        if (typeof product === "string" || product.deleted) {
          continue;
        }
        const interval = price.recurring?.interval;
        out.push({
          stripePriceId: price.id,
          stripeProductId: product.id,
          productName: product.name,
          productDescription: product.description ?? undefined,
          currency: price.currency.toUpperCase(),
          unitAmountMinor: price.unit_amount ?? undefined,
          interval,
          entitlementKeys: entitlementKeysFromMetadata({
            ...product.metadata,
            ...price.metadata,
          }),
          active: price.active && product.active,
        });
      }
      return out;
    },

    async createCustomer(input) {
      const customer = await stripe.customers.create({
        ...(input.email === undefined ? {} : { email: input.email }),
        ...(input.name === undefined ? {} : { name: input.name }),
        metadata: { organizationId: input.organizationId },
      });
      return { customerId: customer.id };
    },

    async createCheckoutSession(input) {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: input.priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: input.organizationId,
        // Do not set payment_method_types — dynamic payment methods.
        ...(input.customerId === undefined
          ? input.customerEmail === undefined
            ? {}
            : { customer_email: input.customerEmail }
          : { customer: input.customerId }),
        subscription_data: {
          metadata: { organizationId: input.organizationId },
        },
        metadata: { organizationId: input.organizationId },
        integration_identifier: integrationIdentifier(),
      });

      if (session.url === null) {
        throw new Error("Stripe Checkout session returned no URL");
      }
      return { url: session.url, sessionId: session.id };
    },

    async createBillingPortalSession(input) {
      const session = await stripe.billingPortal.sessions.create({
        customer: input.customerId,
        return_url: input.returnUrl,
      });
      return { url: session.url };
    },

    constructWebhookEvent(input): PaymentWebhookEvent | undefined {
      if (input.signatureHeader === undefined || input.signatureHeader === "") {
        return undefined;
      }
      try {
        const event = stripe.webhooks.constructEvent(
          input.payload,
          input.signatureHeader,
          input.webhookSecret,
        );
        return {
          id: event.id,
          type: event.type,
          payloadJson: JSON.stringify(event),
        };
      } catch {
        return undefined;
      }
    },

    parseSubscriptionEvent(payloadJson: string): ParsedSubscriptionEvent | undefined {
      let parsed: unknown;
      try {
        parsed = JSON.parse(payloadJson);
      } catch {
        return undefined;
      }

      if (!isStripeEvent(parsed)) {
        return undefined;
      }

      if (
        parsed.type === "customer.subscription.created" ||
        parsed.type === "customer.subscription.updated" ||
        parsed.type === "customer.subscription.deleted"
      ) {
        const subscription = parsed.data.object;
        const kind =
          parsed.type === "customer.subscription.deleted"
            ? "subscription_deleted"
            : "subscription_upsert";
        return parseStripeSubscription(subscription, kind);
      }

      if (parsed.type === "checkout.session.completed") {
        // Subscription details arrive via subscription.* events; nothing to apply here.
        return undefined;
      }

      return undefined;
    },
  };
}

function isStripeEvent(value: unknown): value is Stripe.Event {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "string" &&
    "data" in value &&
    typeof value.data === "object" &&
    value.data !== null &&
    "object" in value.data
  );
}
