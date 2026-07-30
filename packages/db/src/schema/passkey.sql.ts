/**
 * Better Auth passkey / WebAuthn plugin table.
 *
 * See https://www.better-auth.com/docs/plugins/passkey#schema
 */

import { boolean, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth.sql.ts";
import { createdAtColumn, idColumn } from "./columns.ts";

export const passkey = pgTable(
  "passkey",
  {
    id: idColumn(),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    credentialID: text("credential_id").notNull(),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: boolean("backed_up").notNull(),
    transports: text("transports"),
    aaguid: text("aaguid"),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index("idx_passkey__user_id").on(table.userId),
    index("idx_passkey__credential_id").on(table.credentialID),
  ],
);
