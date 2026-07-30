import { z } from "zod";

/** Stripe server credentials. Test keys are rejected when `APP_ENV=production`. */
export const stripe = z.object({
  STRIPE_SECRET_KEY: z.string().min(1).startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).startsWith("whsec_"),
});
