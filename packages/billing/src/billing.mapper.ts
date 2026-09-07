import type { Invoice } from "@repo/contracts";
import type { InvoiceId, OrganizationId } from "@repo/types";

import type { InvoiceRow } from "./billing.repository.ts";

function brandInvoiceId(id: string): InvoiceId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- DB/boundary brand
  return id as InvoiceId;
}

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- DB/boundary brand
  return id as OrganizationId;
}

/** Map a Drizzle invoice row to the wire DTO. */
export function toInvoiceDto(row: InvoiceRow): Invoice {
  return {
    id: brandInvoiceId(row.id),
    organizationId: brandOrganizationId(row.organizationId),
    number: row.number,
    status: row.status,
    amountMinor: row.amountMinor,
    currency: row.currency,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(row.deletedAt === null ? {} : { deletedAt: row.deletedAt.toISOString() }),
  };
}
