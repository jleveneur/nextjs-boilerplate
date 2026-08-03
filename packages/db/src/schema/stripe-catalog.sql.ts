/**
 * Local mirror of Stripe Products and Prices for pricing UI / catalog sync.
 */

import { boolean, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

import { createdAtColumn, idColumn, updatedAtColumn } from "./columns.ts";

export const stripeProduct = pgTable(
  "stripe_product",
  {
    id: idColumn(),
    stripeProductId: text("stripe_product_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex("uq_stripe_product__stripe_product_id").on(table.stripeProductId)],
);

export const stripePrice = pgTable(
  "stripe_price",
  {
    id: idColumn(),
    stripePriceId: text("stripe_price_id").notNull(),
    stripeProductId: text("stripe_product_id").notNull(),
    currency: text("currency").notNull(),
    unitAmountMinor: integer("unit_amount_minor"),
    interval: text("interval"),
    active: boolean("active").notNull().default(true),
    /** Comma-separated feature keys from Stripe price metadata `entitlements`. */
    entitlementKeys: text("entitlement_keys").notNull().default(""),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex("uq_stripe_price__stripe_price_id").on(table.stripePriceId)],
);
