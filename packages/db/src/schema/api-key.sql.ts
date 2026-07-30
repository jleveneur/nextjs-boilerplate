/**
 * Better Auth API key plugin table.
 *
 * Org-owned keys use `referenceId` = organization id. Keys are hashed at rest.
 * See https://www.better-auth.com/docs/plugins/api-key/reference#schema
 */

import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { createdAtColumn, idColumn, updatedAtColumn } from "./columns.ts";

export const apikey = pgTable(
  "apikey",
  {
    id: idColumn(),
    configId: text("config_id").notNull().default("default"),
    name: text("name"),
    start: text("start"),
    prefix: text("prefix"),
    key: text("key").notNull(),
    referenceId: text("reference_id").notNull(),
    refillInterval: integer("refill_interval"),
    refillAmount: integer("refill_amount"),
    lastRefillAt: timestamp("last_refill_at", { withTimezone: true, mode: "date" }),
    enabled: boolean("enabled").notNull().default(true),
    rateLimitEnabled: boolean("rate_limit_enabled").notNull().default(true),
    rateLimitTimeWindow: integer("rate_limit_time_window"),
    rateLimitMax: integer("rate_limit_max"),
    requestCount: integer("request_count").notNull().default(0),
    remaining: integer("remaining"),
    lastRequest: timestamp("last_request", { withTimezone: true, mode: "date" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    permissions: text("permissions"),
    metadata: text("metadata"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("idx_apikey__reference_id").on(table.referenceId),
    index("idx_apikey__config_id").on(table.configId),
  ],
);
