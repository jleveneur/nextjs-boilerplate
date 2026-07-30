import type { InvoiceId, OrganizationId, OutboxId, UserId } from "@repo/types";

/**
 * ID factory for domain writes.
 *
 * Production wraps `generateUuidV7`; tests return a fixed sequence.
 */
export type IdGenerator = {
  uuidV7(): string;
  invoiceId(): InvoiceId;
  organizationId(): OrganizationId;
  userId(): UserId;
  outboxId(): OutboxId;
};
