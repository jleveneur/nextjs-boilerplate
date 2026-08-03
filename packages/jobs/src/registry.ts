/**
 * Job name registry and Zod payload schemas.
 *
 * BullMQ producers and consumers share these contracts. Payloads are
 * identifiers, not documents — handlers re-read current state.
 */

import { z } from "zod";

export const JOB_NAMES = {
  emailSend: "email.send",
  invoiceVoidedNotify: "invoice.voided.notify",
  imageDerive: "image.derive",
  assetReconcileOrphans: "asset.reconcile-orphans",
  stripeEventProcess: "stripe.event.process",
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export const jobPayloadSchemas = {
  "email.send": z.object({
    to: z.email(),
    subject: z.string().min(1),
    organizationId: z.uuid(),
    /** Idempotency key derived by the producer (e.g. outbox row id). */
    idempotencyKey: z.string().min(1),
  }),
  "invoice.voided.notify": z.object({
    invoiceId: z.uuid(),
    organizationId: z.uuid(),
    amountMinor: z.number().int(),
    /** Idempotency key derived by the producer (e.g. outbox row id). */
    idempotencyKey: z.string().min(1),
  }),
  "image.derive": z.object({
    assetId: z.uuid(),
    organizationId: z.uuid(),
    /** Idempotency key derived by the producer (e.g. outbox row id). */
    idempotencyKey: z.string().min(1),
  }),
  "asset.reconcile-orphans": z.object({
    /**
     * Wall-clock cutoff; pending assets older than this are failed.
     * When omitted, the handler defaults to now minus 24 hours.
     */
    olderThanIso: z.string().datetime().optional(),
  }),
  "stripe.event.process": z.object({
    eventId: z.string().min(1),
    eventType: z.string().min(1),
    /** Full Stripe event JSON (already signature-verified at the edge). */
    payloadJson: z.string().min(1),
  }),
} as const satisfies Record<JobName, z.ZodType>;

export type JobPayloadMap = {
  [K in JobName]: z.infer<(typeof jobPayloadSchemas)[K]>;
};

export type JobPayload<N extends JobName> = JobPayloadMap[N];

export function parseJobPayload<N extends JobName>(name: N, payload: unknown): JobPayload<N> {
  // Zod's indexed access widens to a union; re-narrow to the selected job.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return jobPayloadSchemas[name].parse(payload) as JobPayload<N>;
}

export function isJobName(value: string): value is JobName {
  return Object.hasOwn(jobPayloadSchemas, value);
}
