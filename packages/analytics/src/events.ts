/**
 * Typed product-analytics event registry.
 *
 * Every event is declared once with a Zod payload schema. `capture()` is generic
 * over this registry so an unknown name or malformed payload is a compile error.
 *
 * Naming: `<object>.<past-tense-verb>`, snake_case properties, ids only (no PII).
 */

import { z } from "zod";

export const events = {
  "user.signed_up": z.object({
    method: z.enum(["password", "oauth", "magic_link"]),
  }),
  "organization.created": z.object({
    organizationId: z.string(),
    plan: z.string(),
  }),
  "invoice.voided": z.object({
    invoiceId: z.string(),
    organizationId: z.string(),
    amountMinor: z.number().int(),
    currency: z.string(),
  }),
  "asset.confirmed": z.object({
    assetId: z.string(),
    organizationId: z.string(),
  }),
} as const;

export type EventName = keyof typeof events;

export type EventProperties<Name extends EventName> = z.infer<(typeof events)[Name]>;
