import { z } from "zod";

/**
 * Local SMTP + Mailpit. Optional — composition roots prefer SMTP when
 * `SMTP_URL` is set, otherwise Resend.
 */
export const smtp = z.object({
  SMTP_URL: z.string().min(1).optional(),
  MAILPIT_API_URL: z.url().optional(),
});
