/**
 * Better Auth core tables.
 *
 * Property names stay camelCase so the Drizzle adapter can map them in Phase 5
 * without a field rename pass. Column names are snake_case per conventions.
 *
 * See https://www.better-auth.com/docs/concepts/database
 */

import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { createdAtColumn, idColumn, updatedAtColumn } from "./columns.ts";

export const user = pgTable(
  "user",
  {
    id: idColumn(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [uniqueIndex("uq_user__email").on(table.email)],
);

export const session = pgTable(
  "session",
  {
    id: idColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    // Organization plugin extension — filled when a session has an active org.
    activeOrganizationId: uuid("active_organization_id"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("uq_session__token").on(table.token),
    index("idx_session__user_id").on(table.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: idColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [index("idx_account__user_id").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: idColumn(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [index("idx_verification__identifier").on(table.identifier)],
);
