/**
 * Stripe subscription / entitlement application services.
 */

import { authorize, PERMISSIONS } from "@repo/authz";
import { withTransaction, type TenantCtx } from "@repo/db";
import type { SubscriptionStatus } from "@repo/db/schema";
import { NotFoundError, ValidationError } from "@repo/errors";
import { JOB_NAMES } from "@repo/jobs";
import type { OrganizationId } from "@repo/types";

import type { Ctx } from "../ctx.ts";
import {
  findActiveSubscription,
  findStripeCustomerId,
  hasEntitlementRow,
  listMirroredCatalog,
  replaceEntitlements,
  upsertCatalogPrice,
  upsertCatalogProduct,
  upsertStripeCustomer,
  upsertSubscription,
} from "./subscription.repository.ts";

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- boundary brand
  return id as OrganizationId;
}

function tenantCtx(ctx: Ctx): TenantCtx {
  return {
    organizationId: ctx.actor.organizationId,
    db: ctx.tx ?? ctx.db,
  };
}

const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
] as const satisfies readonly SubscriptionStatus[];

function isSubscriptionStatus(status: string): status is SubscriptionStatus {
  return (SUBSCRIPTION_STATUSES as readonly string[]).includes(status);
}

function asSubscriptionStatus(status: string): SubscriptionStatus {
  return isSubscriptionStatus(status) ? status : "incomplete";
}

export async function listBillingCatalog(ctx: Ctx) {
  authorize(ctx.actor, PERMISSIONS["billing:read"], {
    organizationId: ctx.actor.organizationId,
  });

  const mirrored = await listMirroredCatalog(ctx.db);
  if (mirrored.length > 0) {
    return mirrored.map((row) => ({
      stripePriceId: row.stripePriceId,
      stripeProductId: row.stripeProductId,
      productName: row.productName,
      productDescription: row.productDescription ?? undefined,
      currency: row.currency,
      unitAmountMinor: row.unitAmountMinor ?? undefined,
      interval: row.interval ?? undefined,
      entitlementKeys:
        row.entitlementKeys === ""
          ? []
          : row.entitlementKeys
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean),
      active: row.active,
    }));
  }

  return ctx.ports.payments.listCatalogPrices();
}

export async function syncBillingCatalog(ctx: Ctx): Promise<{ count: number }> {
  authorize(ctx.actor, PERMISSIONS["billing:manage"], {
    organizationId: ctx.actor.organizationId,
  });

  const prices = await ctx.ports.payments.listCatalogPrices();
  await Promise.all(
    prices.map(async (price) => {
      await upsertCatalogProduct({
        db: ctx.db,
        stripeProductId: price.stripeProductId,
        name: price.productName,
        description: price.productDescription,
        active: price.active,
      });
      await upsertCatalogPrice({
        db: ctx.db,
        stripePriceId: price.stripePriceId,
        stripeProductId: price.stripeProductId,
        currency: price.currency,
        unitAmountMinor: price.unitAmountMinor,
        interval: price.interval,
        active: price.active,
        entitlementKeys: price.entitlementKeys,
      });
    }),
  );
  return { count: prices.length };
}

export async function getOrganizationSubscription(ctx: Ctx) {
  authorize(ctx.actor, PERMISSIONS["billing:read"], {
    organizationId: ctx.actor.organizationId,
  });

  const row = await findActiveSubscription(tenantCtx(ctx));
  if (row === null) {
    return null;
  }
  return {
    stripeSubscriptionId: row.stripeSubscriptionId,
    stripePriceId: row.stripePriceId,
    stripeProductId: row.stripeProductId,
    status: row.status,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
  };
}

export async function startCheckout(
  ctx: Ctx,
  input: { priceId: string; successUrl: string; cancelUrl: string },
): Promise<{ url: string }> {
  authorize(ctx.actor, PERMISSIONS["billing:manage"], {
    organizationId: ctx.actor.organizationId,
  });

  if (input.priceId.trim() === "") {
    throw new ValidationError({ message: "priceId is required" });
  }

  let customerId = await findStripeCustomerId(tenantCtx(ctx));
  if (customerId === undefined) {
    const created = await ctx.ports.payments.createCustomer({
      organizationId: ctx.actor.organizationId,
      email: undefined,
      name: undefined,
    });
    customerId = created.customerId;
    await upsertStripeCustomer(tenantCtx(ctx), {
      id: ctx.ports.ids.uuidV7(),
      stripeCustomerId: customerId,
    });
  }

  const session = await ctx.ports.payments.createCheckoutSession({
    organizationId: ctx.actor.organizationId,
    priceId: input.priceId,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    customerId,
    customerEmail: undefined,
  });

  return { url: session.url };
}

export async function openBillingPortal(
  ctx: Ctx,
  input: { returnUrl: string },
): Promise<{ url: string }> {
  authorize(ctx.actor, PERMISSIONS["billing:manage"], {
    organizationId: ctx.actor.organizationId,
  });

  const customerId = await findStripeCustomerId(tenantCtx(ctx));
  if (customerId === undefined) {
    throw new NotFoundError({ resource: "stripe_customer", id: ctx.actor.organizationId });
  }

  const session = await ctx.ports.payments.createBillingPortalSession({
    customerId,
    returnUrl: input.returnUrl,
  });
  return { url: session.url };
}

export async function organizationHasEntitlement(ctx: Ctx, featureKey: string): Promise<boolean> {
  authorize(ctx.actor, PERMISSIONS["billing:read"], {
    organizationId: ctx.actor.organizationId,
  });
  return hasEntitlementRow(tenantCtx(ctx), featureKey);
}

/** Enqueue durable processing for a verified Stripe webhook event. */
export async function enqueueStripeWebhookEvent(
  ctx: Ctx,
  input: { eventId: string; eventType: string; payloadJson: string },
): Promise<void> {
  await ctx.ports.jobs.enqueue(
    JOB_NAMES.stripeEventProcess,
    {
      eventId: input.eventId,
      eventType: input.eventType,
      payloadJson: input.payloadJson,
    },
    { jobId: `stripe-event-${input.eventId}` },
  );
}

/**
 * Apply a Stripe subscription event (worker). Uses system actor for the org.
 */
export async function applyStripeSubscriptionEvent(ctx: Ctx, payloadJson: string): Promise<void> {
  const parsed = ctx.ports.payments.parseSubscriptionEvent(payloadJson);
  if (parsed === undefined) {
    return;
  }

  const organizationId = parsed.organizationId;
  if (organizationId === undefined || organizationId === "") {
    ctx.logger.warn(
      { stripeSubscriptionId: parsed.stripeSubscriptionId },
      "stripe event missing organizationId metadata — skipped",
    );
    return;
  }

  const orgId = brandOrganizationId(organizationId);
  const scoped: Ctx = {
    ...ctx,
    actor: { ...ctx.actor, organizationId: orgId },
  };

  await withTransaction(scoped.db, async (tx) => {
    const txCtx: Ctx = { ...scoped, tx };
    const tenant = tenantCtx(txCtx);

    if (parsed.stripeCustomerId !== undefined) {
      await upsertStripeCustomer(tenant, {
        id: txCtx.ports.ids.uuidV7(),
        stripeCustomerId: parsed.stripeCustomerId,
      });
    }

    if (parsed.kind === "subscription_deleted") {
      await upsertSubscription(tenant, {
        id: txCtx.ports.ids.uuidV7(),
        stripeSubscriptionId: parsed.stripeSubscriptionId,
        stripePriceId: parsed.stripePriceId || "unknown",
        stripeProductId: parsed.stripeProductId || "unknown",
        status: "canceled",
        currentPeriodStart: parsed.currentPeriodStart,
        currentPeriodEnd: parsed.currentPeriodEnd,
        cancelAtPeriodEnd: true,
      });
      await replaceEntitlements(tenant, []);
      return;
    }

    await upsertSubscription(tenant, {
      id: txCtx.ports.ids.uuidV7(),
      stripeSubscriptionId: parsed.stripeSubscriptionId,
      stripePriceId: parsed.stripePriceId || "unknown",
      stripeProductId: parsed.stripeProductId || "unknown",
      status: asSubscriptionStatus(parsed.status),
      currentPeriodStart: parsed.currentPeriodStart,
      currentPeriodEnd: parsed.currentPeriodEnd,
      cancelAtPeriodEnd: parsed.cancelAtPeriodEnd,
    });

    const active = parsed.status === "active" || parsed.status === "trialing";
    await replaceEntitlements(tenant, active ? parsed.entitlementKeys : []);
  });
}
