import { z } from "zod";

import { definePreset } from "../merge-presets.ts";
import { mailProblems } from "./mail-problems.ts";

/** Resend email delivery. Optional when composed next to `smtp`. */
export const resend = definePreset(
  z.object({
    RESEND_API_KEY: z.string().min(1).startsWith("re_").optional(),
    EMAIL_FROM: z.email(),
  }),
  mailProblems,
);
