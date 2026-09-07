import type { AssetId, InvoiceId, OrganizationId, OutboxId, UserId } from "@repo/types";

import type { IdGenerator } from "../ports/id-generator.ts";

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

/** Deterministic sequence for unit tests. */
export function createSequenceIdGenerator(prefix = "01900000-0000-7000-8000"): IdGenerator {
  let n = 0;
  const next = (): string => {
    n += 1;
    return `${prefix}-${n.toString(16).padStart(12, "0")}`;
  };

  return {
    uuidV7: next,
    invoiceId: () => brandInvoiceId(next()),
    assetId: () => brandAssetId(next()),
    organizationId: () => brandOrganizationId(next()),
    userId: () => brandUserId(next()),
    outboxId: () => brandOutboxId(next()),
  };
}
