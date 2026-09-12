import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/**
 * Database schema.
 *
 * Columns are `snake_case`; the TypeScript properties are `camelCase`. Drizzle
 * makes that mapping explicit at the column, which is the only place it should
 * ever appear.
 *
 * Migrations are generated from this file (`pnpm db:generate`) and reviewed as
 * SQL before they are applied. Nothing generates them at runtime.
 */

const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// --- Better Auth ------------------------------------------------------------
// The four core tables Better Auth's Drizzle adapter expects. Text ids, because
// that is what Better Auth generates by default.
// https://www.better-auth.com/docs/concepts/database

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /**
   * The organization this user was last working in, so the choice survives
   * signing out. Deliberately not a foreign key: membership is checked before
   * the value is used, which already covers a deleted or departed
   * organization, and a column Better Auth does not know about must stay
   * harmless to it.
   */
  lastActiveOrganizationId: text("last_active_organization_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    // Organization plugin: which tenant this session is currently acting in.
    // No foreign key — Better Auth writes it through the adapter and expects to
    // be able to clear it, and a deleted organization must not delete sessions.
    activeOrganizationId: text("active_organization_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("idx_session__user_id").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
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
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("idx_account__user_id").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("idx_verification__identifier").on(table.identifier)],
);

// --- Better Auth: organization plugin ----------------------------------------
// Field names and nullability follow the plugin's own schema exactly. Diverging
// here produces adapter errors at runtime, not at build time.
// https://www.better-auth.com/docs/plugins/organization

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: createdAt(),
});

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("uq_member__organization_id_user_id").on(table.organizationId, table.userId),
    index("idx_member__user_id").on(table.userId),
  ],
);

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    index("idx_invitation__organization_id").on(table.organizationId),
    index("idx_invitation__email").on(table.email),
  ],
);

// --- Application ------------------------------------------------------------
// One example table so the starter has something end to end to show. Delete it
// and its router when you add a real domain.

export const post = pgTable(
  "post",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Every tenant-scoped table leads with organization_id, and every query
    // filters on it. A query without that filter is a data leak, not a bug.
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("idx_post__organization_id").on(table.organizationId)],
);

export type Post = typeof post.$inferSelect;
export type User = typeof user.$inferSelect;
export type Organization = typeof organization.$inferSelect;
