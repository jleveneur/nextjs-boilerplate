/**
 * Better Auth two-factor plugin table.
 *
 * See https://www.better-auth.com/docs/plugins/2fa#schema
 */

import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth.sql.ts";
import { idColumn } from "./columns.ts";

export const twoFactor = pgTable(
  "two_factor",
  {
    id: idColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    verified: boolean("verified").notNull().default(false),
    failedVerificationCount: integer("failed_verification_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true, mode: "date" }),
  },
  (table) => [index("idx_two_factor__user_id").on(table.userId)],
);
