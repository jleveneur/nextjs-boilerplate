/**
 * Job name registry and Zod payload schemas.
 *
 * Both BullMQ and (optional) Trigger.dev consume these contracts. Payloads are
 * identifiers, not documents — handlers re-read current state.
 */

import { z } from "zod";

export const JOB_NAMES = {
  emailSend: "email.send",
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
} as const satisfies Record<JobName, z.ZodType>;

export type JobPayloadMap = {
  [K in JobName]: z.infer<(typeof jobPayloadSchemas)[K]>;
};

export type JobPayload<N extends JobName> = JobPayloadMap[N];

export function parseJobPayload<N extends JobName>(name: N, payload: unknown): JobPayload<N> {
  return jobPayloadSchemas[name].parse(payload);
}

export function isJobName(value: string): value is JobName {
  return Object.hasOwn(jobPayloadSchemas, value);
}
