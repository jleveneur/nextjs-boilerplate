/**
 * Stripe Customer mapped 1:1 to an organization (tenant billing account).
 */

import { pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { createdAtColumn, idColumn, updatedAtColumn } from "./columns.ts";
import { organization } from "./organization.sql.ts";

export const stripeCustomer = pgTable(
  "stripe_customer",
  {
    id: idColumn(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("uq_stripe_customer__organization_id").on(table.organizationId),
    uniqueIndex("uq_stripe_customer__stripe_customer_id").on(table.stripeCustomerId),
  ],
);
