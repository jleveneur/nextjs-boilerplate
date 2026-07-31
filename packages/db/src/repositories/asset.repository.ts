/**
 * Asset repository — tenant-scoped reads/writes plus system reconcile helpers.
 */

import { and, eq, lt, sql } from "drizzle-orm";
import type { AssetId, OrganizationId, UserId } from "@repo/types";

import type { DbExecutor } from "../with-transaction.ts";
import { asset, type AssetStatus } from "../schema/asset.sql.ts";
import { scopedWhere, type TenantCtx } from "../tenant.ts";

export type AssetRow = typeof asset.$inferSelect;

export type InsertAssetInput = {
  id: AssetId;
  organizationId: OrganizationId;
  ownerUserId: UserId;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  originalFilename: string;
  status?: AssetStatus;
};

/**
 * Returns the asset when it belongs to the tenant, otherwise `null`.
 *
 * A missing row and a cross-tenant row are the same result: the caller must not
 * learn that the id exists in another organisation.
 */
export async function findAssetById(ctx: TenantCtx, assetId: AssetId): Promise<AssetRow | null> {
  const rows = await ctx.db
    .select()
    .from(asset)
    .where(scopedWhere(ctx, asset, eq(asset.id, assetId)))
    .limit(1);

  return rows[0] ?? null;
}

export async function insertAsset(ctx: TenantCtx, input: InsertAssetInput): Promise<AssetRow> {
  const [row] = await ctx.db
    .insert(asset)
    .values({
      id: input.id,
      organizationId: input.organizationId,
      ownerUserId: input.ownerUserId,
      storageKey: input.storageKey,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      originalFilename: input.originalFilename,
      status: input.status ?? "pending",
    })
    .returning();

  if (row === undefined) {
    throw new Error("insertAsset: insert returned no row");
  }

  return row;
}

export async function updateAssetStatus(
  ctx: TenantCtx,
  assetId: AssetId,
  status: AssetStatus,
  patch?: { sizeBytes?: number },
): Promise<AssetRow | null> {
  const [row] = await ctx.db
    .update(asset)
    .set({
      status,
      ...(patch?.sizeBytes === undefined ? {} : { sizeBytes: patch.sizeBytes }),
      updatedAt: sql`now()`,
    })
    .where(scopedWhere(ctx, asset, eq(asset.id, assetId)))
    .returning();

  return row ?? null;
}

/**
 * System-only: pending assets older than `olderThan` (orphan reconcile).
 * Not tenant-scoped — caller must be a system actor.
 */
export async function listStalePendingAssets(
  db: DbExecutor,
  olderThan: Date,
  limit: number,
): Promise<AssetRow[]> {
  return db
    .select()
    .from(asset)
    .where(and(eq(asset.status, "pending"), lt(asset.createdAt, olderThan)))
    .limit(limit);
}
