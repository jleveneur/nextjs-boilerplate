/**
 * Schema for the planned append-only audit trail.
 *
 * Application writers must never update or soft-delete rows. Cross-tenant
 * support paths must write here in the same transaction as the change they
 * describe. Auth/org/API-key events are recorded from Better Auth hooks via
 * `recordAuditLog`; invoice voiding uses `writeAuditLog`.
 */

import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth.sql.ts";
import { createdAtColumn, idColumn } from "./columns.ts";
import { organization } from "./organization.sql.ts";

export const auditLog = pgTable(
  "audit_log",
  {
    id: idColumn(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("idx_audit_log__organization_id_created_at").on(table.organizationId, table.createdAt),
    index("idx_audit_log__organization_id_resource").on(
      table.organizationId,
      table.resourceType,
      table.resourceId,
    ),
  ],
);
