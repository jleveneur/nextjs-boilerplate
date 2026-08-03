// Side-effect import: throws under the client export condition.
// oxlint-disable-next-line import/no-unassigned-import
import "server-only";

export {
  createDb,
  DEFAULT_IDLE_IN_TRANSACTION_TIMEOUT_MS,
  DEFAULT_POOL_SIZE,
  DEFAULT_STATEMENT_TIMEOUT_MS,
  type CreateDbOptions,
  type Database,
  type QueryLogEvent,
  type SqlClient,
} from "./client.ts";
export {
  findAssetById,
  insertAsset,
  listStalePendingAssets,
  updateAssetStatus,
  type AssetRow,
  type InsertAssetInput,
} from "./repositories/asset.repository.ts";
export {
  claimPendingOutboxEvents,
  markOutboxFailed,
  markOutboxPublished,
  type OutboxClaimRow,
} from "./repositories/outbox.repository.ts";
export { findOrganizationOwnerEmail } from "./repositories/organization.repository.ts";
export * from "./schema/index.ts";
export { scopedWhere, tenantFilter, type TenantCtx, type TenantScopedTable } from "./tenant.ts";
export {
  getTransaction,
  resolveDb,
  withTransaction,
  type DbExecutor,
  type DbTransaction,
} from "./with-transaction.ts";
