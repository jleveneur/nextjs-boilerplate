/**
 * Object-storage metadata.
 *
 * Every uploaded file has a row. The storage key is not the id — see
 * `@repo/storage` for key conventions. Status tracks the upload lifecycle.
 */

import { bigint, index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth.sql.ts";
import { createdAtColumn, deletedAtColumn, idColumn, updatedAtColumn } from "./columns.ts";
import { organization } from "./organization.sql.ts";

/** Upload lifecycle. `pending` until the worker confirms the object exists. */
export type AssetStatus = "pending" | "ready" | "failed";

export const asset = pgTable(
  "asset",
  {
    id: idColumn(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: text("status").$type<AssetStatus>().notNull().default("pending"),
    storageKey: text("storage_key").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    originalFilename: text("original_filename"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    deletedAt: deletedAtColumn(),
  },
  (table) => [
    index("idx_asset__organization_id_created_at").on(table.organizationId, table.createdAt),
    index("idx_asset__organization_id_status").on(table.organizationId, table.status),
    index("idx_asset__storage_key").on(table.storageKey),
  ],
);
