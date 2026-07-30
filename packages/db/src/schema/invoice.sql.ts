/**
 * Tenant-scoped invoices (billing vertical slice).
 *
 * Amounts are integers in minor units. Status transitions are enforced in
 * `@repo/core` policy — the column is storage, not a state machine.
 */

import { index, integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { createdAtColumn, deletedAtColumn, idColumn, updatedAtColumn } from "./columns.ts";
import { organization } from "./organization.sql.ts";

/** Invoice lifecycle stored on the row. */
export type InvoiceStatus = "draft" | "open" | "paid" | "void";

export const invoice = pgTable(
  "invoice",
  {
    id: idColumn(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    status: text("status").$type<InvoiceStatus>().notNull().default("draft"),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("USD"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    deletedAt: deletedAtColumn(),
  },
  (table) => [
    uniqueIndex("uidx_invoice__organization_id_number").on(table.organizationId, table.number),
    index("idx_invoice__organization_id_created_at").on(table.organizationId, table.createdAt),
    index("idx_invoice__organization_id_status").on(table.organizationId, table.status),
  ],
);
