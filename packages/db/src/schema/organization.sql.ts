/**
 * Better Auth organization plugin tables.
 *
 * `organization_id` leads every composite index on tenant-scoped rows.
 */

import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth.sql.ts";
import { createdAtColumn, deletedAtColumn, idColumn, updatedAtColumn } from "./columns.ts";

export const organization = pgTable(
  "organization",
  {
    id: idColumn(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logo: text("logo"),
    // Better Auth stores metadata as a string; keep it text for adapter compatibility.
    metadata: text("metadata"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    deletedAt: deletedAtColumn(),
  },
  (table) => [uniqueIndex("uq_organization__slug").on(table.slug)],
);

export const member = pgTable(
  "member",
  {
    id: idColumn(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("uq_member__organization_id_user_id").on(table.organizationId, table.userId),
    index("idx_member__organization_id").on(table.organizationId),
    index("idx_member__user_id").on(table.userId),
  ],
);

export const invitation = pgTable(
  "invitation",
  {
    id: idColumn(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role"),
    status: text("status").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("idx_invitation__organization_id").on(table.organizationId),
    index("idx_invitation__email").on(table.email),
  ],
);
