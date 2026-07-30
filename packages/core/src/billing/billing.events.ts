import type { DomainEvent } from "../ports/event-bus.ts";

export const INVOICE_VOIDED = "invoice.voided" as const;

export type InvoiceVoidedPayload = {
  invoiceId: string;
  organizationId: string;
  amountMinor: number;
  currency: string;
  /** Outbox row id — used as the job idempotency key. */
  outboxId: string;
};

export type InvoiceVoidedEvent = DomainEvent<typeof INVOICE_VOIDED, InvoiceVoidedPayload>;

export function invoiceVoidedEvent(
  payload: InvoiceVoidedPayload,
  occurredAt: Date,
): InvoiceVoidedEvent {
  return { type: INVOICE_VOIDED, payload, occurredAt };
}
