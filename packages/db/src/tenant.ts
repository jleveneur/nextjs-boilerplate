/**
 * Tenant-scoped context and query helpers.
 *
 * Forgetting `organization_id` on a query is the catastrophic multi-tenant bug.
 * Repository functions for tenant-scoped tables take {@link TenantCtx}, not a
 * bare database handle, so calling one without a tenant is a type error.
 */

import { and, eq, type Column, type SQL } from "drizzle-orm";
import type { OrganizationId } from "@repo/types";

import type { DbExecutor } from "./with-transaction.ts";

/**
 * Resolved tenant boundary plus the database handle to use for the query.
 *
 * Produced by `orgProcedure` in the transport layer (Phase 6+). Repository
 * functions accept this and nothing weaker.
 */
export type TenantCtx = {
  organizationId: OrganizationId;
  db: DbExecutor;
};

/** Tables that carry a non-null `organization_id` discriminator. */
export type TenantScopedTable = {
  organizationId: Column;
};

/**
 * Equality predicate on `organization_id`.
 *
 * Prefer {@link scopedWhere} when combining with other predicates so the tenant
 * filter cannot be dropped by a careless `where` replacement.
 */
export function tenantFilter(table: TenantScopedTable, organizationId: OrganizationId): SQL {
  return eq(table.organizationId, organizationId);
}

/**
 * Combines the tenant filter with zero or more additional predicates.
 *
 * ```ts
 * .where(scopedWhere(ctx, asset, eq(asset.id, assetId)))
 * ```
 */
export function scopedWhere(
  ctx: Pick<TenantCtx, "organizationId">,
  table: TenantScopedTable,
  ...conditions: Array<SQL | undefined>
): SQL {
  const organizationPredicate = tenantFilter(table, ctx.organizationId);
  const extras = conditions.filter((condition): condition is SQL => condition !== undefined);
  // `and` with one argument returns that argument; with many, an AND expression.
  return and(organizationPredicate, ...extras) ?? organizationPredicate;
}
