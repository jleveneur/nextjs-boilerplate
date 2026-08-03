import { and, eq } from "drizzle-orm";
import {
  entitlement,
  stripeCustomer,
  stripePrice,
  stripeProduct,
  subscription,
  type SubscriptionStatus,
} from "@repo/db/schema";
import type { TenantCtx } from "@repo/db";

export async function findStripeCustomerId(tenant: TenantCtx): Promise<string | undefined> {
  const rows = await tenant.db
    .select({ stripeCustomerId: stripeCustomer.stripeCustomerId })
    .from(stripeCustomer)
    .where(eq(stripeCustomer.organizationId, tenant.organizationId))
    .limit(1);
  return rows[0]?.stripeCustomerId;
}

export async function upsertStripeCustomer(
  tenant: TenantCtx,
  input: { id: string; stripeCustomerId: string },
): Promise<void> {
  await tenant.db
    .insert(stripeCustomer)
    .values({
      id: input.id,
      organizationId: tenant.organizationId,
      stripeCustomerId: input.stripeCustomerId,
    })
    .onConflictDoUpdate({
      target: stripeCustomer.organizationId,
      set: { stripeCustomerId: input.stripeCustomerId },
    });
}

export async function findActiveSubscription(tenant: TenantCtx) {
  const rows = await tenant.db
    .select()
    .from(subscription)
    .where(eq(subscription.organizationId, tenant.organizationId))
    .limit(20);
  return (
    rows.find((row) => row.status === "active" || row.status === "trialing") ?? rows[0] ?? null
  );
}

export async function upsertSubscription(
  tenant: TenantCtx,
  input: {
    id: string;
    stripeSubscriptionId: string;
    stripePriceId: string;
    stripeProductId: string;
    status: SubscriptionStatus;
    currentPeriodStart: Date | undefined;
    currentPeriodEnd: Date | undefined;
    cancelAtPeriodEnd: boolean;
  },
): Promise<void> {
  await tenant.db
    .insert(subscription)
    .values({
      id: input.id,
      organizationId: tenant.organizationId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      stripePriceId: input.stripePriceId,
      stripeProductId: input.stripeProductId,
      status: input.status,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    })
    .onConflictDoUpdate({
      target: subscription.stripeSubscriptionId,
      set: {
        stripePriceId: input.stripePriceId,
        stripeProductId: input.stripeProductId,
        status: input.status,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      },
    });
}

export async function replaceEntitlements(tenant: TenantCtx, featureKeys: string[]): Promise<void> {
  await tenant.db.delete(entitlement).where(eq(entitlement.organizationId, tenant.organizationId));

  if (featureKeys.length === 0) {
    return;
  }

  await tenant.db.insert(entitlement).values(
    featureKeys.map((featureKey) => ({
      organizationId: tenant.organizationId,
      featureKey,
    })),
  );
}

export async function hasEntitlementRow(tenant: TenantCtx, featureKey: string): Promise<boolean> {
  const rows = await tenant.db
    .select({ id: entitlement.id })
    .from(entitlement)
    .where(
      and(
        eq(entitlement.organizationId, tenant.organizationId),
        eq(entitlement.featureKey, featureKey),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function upsertCatalogProduct(input: {
  db: TenantCtx["db"];
  stripeProductId: string;
  name: string;
  description: string | undefined;
  active: boolean;
}): Promise<void> {
  await input.db
    .insert(stripeProduct)
    .values({
      stripeProductId: input.stripeProductId,
      name: input.name,
      description: input.description,
      active: input.active,
    })
    .onConflictDoUpdate({
      target: stripeProduct.stripeProductId,
      set: {
        name: input.name,
        description: input.description,
        active: input.active,
      },
    });
}

export async function upsertCatalogPrice(input: {
  db: TenantCtx["db"];
  stripePriceId: string;
  stripeProductId: string;
  currency: string;
  unitAmountMinor: number | undefined;
  interval: string | undefined;
  active: boolean;
  entitlementKeys: string[];
}): Promise<void> {
  await input.db
    .insert(stripePrice)
    .values({
      stripePriceId: input.stripePriceId,
      stripeProductId: input.stripeProductId,
      currency: input.currency,
      unitAmountMinor: input.unitAmountMinor,
      interval: input.interval,
      active: input.active,
      entitlementKeys: input.entitlementKeys.join(","),
    })
    .onConflictDoUpdate({
      target: stripePrice.stripePriceId,
      set: {
        stripeProductId: input.stripeProductId,
        currency: input.currency,
        unitAmountMinor: input.unitAmountMinor,
        interval: input.interval,
        active: input.active,
        entitlementKeys: input.entitlementKeys.join(","),
      },
    });
}

export async function listMirroredCatalog(db: TenantCtx["db"]) {
  return db
    .select({
      stripePriceId: stripePrice.stripePriceId,
      stripeProductId: stripePrice.stripeProductId,
      productName: stripeProduct.name,
      productDescription: stripeProduct.description,
      currency: stripePrice.currency,
      unitAmountMinor: stripePrice.unitAmountMinor,
      interval: stripePrice.interval,
      entitlementKeys: stripePrice.entitlementKeys,
      active: stripePrice.active,
    })
    .from(stripePrice)
    .innerJoin(stripeProduct, eq(stripePrice.stripeProductId, stripeProduct.stripeProductId))
    .where(eq(stripePrice.active, true));
}
