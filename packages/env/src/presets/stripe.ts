import { z } from "zod";

import { emptyToUndefined } from "../coerce.ts";

/**
 * Stripe server credentials (optional until wired).
 * Prefer a restricted key (`rk_`) in production; `sk_` test keys are rejected when
 * `APP_ENV=production`.
 */
export const stripe = z.object({
  STRIPE_SECRET_KEY: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .min(1)
      .refine((value) => value.startsWith("sk_") || value.startsWith("rk_"), {
        message: "must start with sk_ or rk_",
      })
      .optional(),
  ),
  STRIPE_WEBHOOK_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(1).startsWith("whsec_").optional(),
  ),
});
