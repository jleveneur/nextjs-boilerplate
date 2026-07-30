/**
 * Composition-root helper: when `invoice.voided` fires, enqueue the notify job.
 *
 * Production will prefer the outbox relay (Phase 10). This subscriber proves the
 * event→job contract in unit tests and can bridge until the relay lands.
 */

import { JOB_NAMES } from "@repo/jobs";

import type { EventBus } from "../ports/event-bus.ts";
import type { JobQueue } from "../ports/job-queue.ts";
import { INVOICE_VOIDED, type InvoiceVoidedPayload } from "./billing.events.ts";

export function subscribeInvoiceVoidedNotify(bus: EventBus, jobs: JobQueue): () => void {
  return bus.subscribe(INVOICE_VOIDED, async (event) => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- event type narrow
    const payload = event.payload as InvoiceVoidedPayload;
    await jobs.enqueue(JOB_NAMES.invoiceVoidedNotify, {
      invoiceId: payload.invoiceId,
      organizationId: payload.organizationId,
      amountMinor: payload.amountMinor,
      idempotencyKey: payload.outboxId,
    });
  });
}
