/**
 * Money on the wire.
 *
 * Always an integer in minor units plus an ISO 4217 currency code. Floating-point
 * money is a bug with a delayed fuse; formatting is a presentation concern via
 * `Intl.NumberFormat`, not a wire concern.
 */

import { z } from "zod";

/** ISO 4217 alphabetic code. Uppercase, exactly three letters. */
export const currencyCodeSchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/u, "must be an ISO 4217 alphabetic code");

export type CurrencyCode = z.infer<typeof currencyCodeSchema>;

/**
 * An amount in minor units (cents, pence, …) with its currency.
 *
 * Negative amounts are allowed: credits, refunds, and adjustments are money too.
 * Zero is allowed. The scale is implied by the currency (JPY has zero decimal
 * places; most others have two) and is applied only at the presentation edge.
 */
export const moneySchema = z.object({
  amountMinor: z.number().int(),
  currency: currencyCodeSchema,
});

export type Money = z.infer<typeof moneySchema>;
