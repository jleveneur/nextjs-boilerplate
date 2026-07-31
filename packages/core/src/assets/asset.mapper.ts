import type { Asset } from "@repo/contracts";
import type { AssetRow } from "@repo/db";
import type { AssetId, OrganizationId, UserId } from "@repo/types";

function brandAssetId(id: string): AssetId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- DB/boundary brand
  return id as AssetId;
}

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- DB/boundary brand
  return id as OrganizationId;
}

function brandUserId(id: string): UserId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- DB/boundary brand
  return id as UserId;
}

export function toAssetDto(row: AssetRow): Asset {
  return {
    id: brandAssetId(row.id),
    organizationId: brandOrganizationId(row.organizationId),
    ownerUserId: brandUserId(row.ownerUserId),
    status: row.status,
    storageKey: row.storageKey,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    originalFilename: row.originalFilename,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
