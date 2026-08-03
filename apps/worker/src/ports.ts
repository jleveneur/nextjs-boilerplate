import { asAssetId, asInvoiceId, asOrganizationId, asOutboxId, asUserId } from "@repo/contracts";
import type { IdGenerator } from "@repo/core";
import { generateUuidV7 } from "@repo/utils";

export function createUuidIdGenerator(): IdGenerator {
  return {
    uuidV7: () => generateUuidV7(),
    invoiceId: () => asInvoiceId(generateUuidV7()),
    assetId: () => asAssetId(generateUuidV7()),
    organizationId: () => asOrganizationId(generateUuidV7()),
    userId: () => asUserId(generateUuidV7()),
    outboxId: () => asOutboxId(generateUuidV7()),
  };
}
