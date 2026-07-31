import type { IdGenerator } from "@repo/core";
import type { AssetId, InvoiceId, OrganizationId, OutboxId, UserId } from "@repo/types";
import { generateUuidV7 } from "@repo/utils";

function brandInvoiceId(id: string): InvoiceId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- port brand constructor
  return id as InvoiceId;
}

function brandAssetId(id: string): AssetId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- port brand constructor
  return id as AssetId;
}

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- port brand constructor
  return id as OrganizationId;
}

function brandUserId(id: string): UserId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- port brand constructor
  return id as UserId;
}

function brandOutboxId(id: string): OutboxId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- port brand constructor
  return id as OutboxId;
}

export function createUuidIdGenerator(): IdGenerator {
  return {
    uuidV7: () => generateUuidV7(),
    invoiceId: () => brandInvoiceId(generateUuidV7()),
    assetId: () => brandAssetId(generateUuidV7()),
    organizationId: () => brandOrganizationId(generateUuidV7()),
    userId: () => brandUserId(generateUuidV7()),
    outboxId: () => brandOutboxId(generateUuidV7()),
  };
}
