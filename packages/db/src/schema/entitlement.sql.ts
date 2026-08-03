/**
 * Derived feature entitlements for an organization (from active subscription).
 */

import { pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { createdAtColumn, idColumn, updatedAtColumn } from "./columns.ts";
import { organization } from "./organization.sql.ts";

export const entitlement = pgTable(
  "entitlement",
  {
    id: idColumn(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    featureKey: text("feature_key").notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("uq_entitlement__organization_id_feature_key").on(
      table.organizationId,
      table.featureKey,
    ),
  ],
);
