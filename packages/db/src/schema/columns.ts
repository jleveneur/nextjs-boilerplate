/**
 * Shared column helpers.
 *
 * Kept tiny on purpose: every table that needs a primary key or a pair of
 * timestamps should look identical, so a reviewer can spot the one that does
 * not.
 */

import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

/** UUIDv7 primary key. Postgres 18 generates these natively when omitted. */
export function idColumn() {
  return uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`);
}

/** `timestamptz` column that defaults to now. */
export function createdAtColumn() {
  return timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();
}

/**
 * `timestamptz` updated on every write.
 *
 * Application code should set this explicitly on updates; the `$onUpdate` hook
 * covers the common path so a forgotten assignment does not leave a stale value.
 */
export function updatedAtColumn() {
  return timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
}

/** Soft-delete marker. Null means the row is live. */
export function deletedAtColumn() {
  return timestamp("deleted_at", { withTimezone: true, mode: "date" });
}
