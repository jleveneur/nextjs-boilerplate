/**
 * Stripe subscription mirror for an organization.
 *
 * Stripe remains source of truth; this row is for local entitlement checks and UI.
 */

import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { createdAtColumn, idColumn, updatedAtColumn } from "./columns.ts";
import { organization } from "./organization.sql.ts";

/** Subset of Stripe subscription statuses we persist. */
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export const subscription = pgTable(
  "subscription",
  {
    id: idColumn(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    stripePriceId: text("stripe_price_id").notNull(),
    stripeProductId: text("stripe_product_id").notNull(),
    status: text("status").$type<SubscriptionStatus>().notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true, mode: "date" }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true, mode: "date" }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("uq_subscription__stripe_subscription_id").on(table.stripeSubscriptionId),
    index("idx_subscription__organization_id").on(table.organizationId),
    index("idx_subscription__organization_id_status").on(table.organizationId, table.status),
  ],
);
