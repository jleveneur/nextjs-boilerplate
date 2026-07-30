/**
 * Transactional outbox.
 *
 * Domain state change and outbox insert share one transaction so an event cannot
 * be lost between commit and enqueue (ADR-0007).
 */

import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { createdAtColumn, idColumn, updatedAtColumn } from "./columns.ts";
import { organization } from "./organization.sql.ts";

/** Lifecycle of an outbox row while the relay is catching up. */
export type OutboxStatus = "pending" | "published" | "failed";

export const outbox = pgTable(
  "outbox",
  {
    id: idColumn(),
    // Nullable: some system events are not tenant-scoped. Tenant events always set it.
    organizationId: uuid("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: text("status").$type<OutboxStatus>().notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    lastError: text("last_error"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("idx_outbox__status_available_at").on(table.status, table.availableAt),
    index("idx_outbox__organization_id_created_at").on(table.organizationId, table.createdAt),
  ],
);
