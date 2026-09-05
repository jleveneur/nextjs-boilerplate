import { z } from "zod";

import { definePreset } from "../merge-presets.ts";
import { mailProblems } from "./mail-problems.ts";

/**
 * Local SMTP + Mailpit. Optional when composed next to `resend` — at least one
 * delivery channel is required. Composition roots prefer SMTP when `SMTP_URL`
 * is set.
 */
export const smtp = definePreset(
  z.object({
    EMAIL_FROM: z.email(),
    SMTP_URL: z.string().min(1).optional(),
    MAILPIT_API_URL: z.url().optional(),
  }),
  mailProblems,
);
