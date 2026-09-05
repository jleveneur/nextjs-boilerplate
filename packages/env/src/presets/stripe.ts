import { z } from "zod";

import { definePreset } from "../merge-presets.ts";

/**
 * Stripe server credentials (optional until wired).
 * Prefer a restricted key (`rk_`) in production; `sk_` test keys are rejected when
 * `APP_ENV` is `staging` or `production`.
 */
export const stripe = definePreset(
  z.object({
    STRIPE_SECRET_KEY: z
      .string()
      .min(1)
      .refine((value) => value.startsWith("sk_") || value.startsWith("rk_"), {
        message: "must start with sk_ or rk_",
      })
      .optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).startsWith("whsec_").optional(),
  }),
  (env) => {
    const problems: string[] = [];
    const secretSet = env["STRIPE_SECRET_KEY"] !== undefined;
    const webhookSet = env["STRIPE_WEBHOOK_SECRET"] !== undefined;

    if (secretSet && !webhookSet) {
      problems.push("STRIPE_WEBHOOK_SECRET: required when STRIPE_SECRET_KEY is set");
    }
    if (webhookSet && !secretSet) {
      problems.push("STRIPE_SECRET_KEY: required when STRIPE_WEBHOOK_SECRET is set");
    }

    if (Object.hasOwn(env, "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")) {
      const publishableSet = env["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"] !== undefined;
      if (publishableSet && !secretSet) {
        problems.push("STRIPE_SECRET_KEY: required when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set");
      }
      if (secretSet && !publishableSet) {
        problems.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: required when STRIPE_SECRET_KEY is set");
      }
    }

    return problems;
  },
);
