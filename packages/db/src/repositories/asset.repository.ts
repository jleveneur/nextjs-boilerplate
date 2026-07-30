/**
 * Asset repository.
 *
 * The first tenant-scoped repository — establishes the pattern every later
 * function follows, including a mandatory cross-tenant isolation test.
 */

import { eq } from "drizzle-orm";
import type { AssetId } from "@repo/types";

import { asset } from "../schema/asset.sql.ts";
import { scopedWhere, type TenantCtx } from "../tenant.ts";

export type AssetRow = typeof asset.$inferSelect;

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
