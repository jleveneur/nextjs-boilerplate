import { z } from "zod";

/** Resend email delivery. */
export const resend = z.object({
  RESEND_API_KEY: z.string().min(1).startsWith("re_"),
  EMAIL_FROM: z.email(),
});
