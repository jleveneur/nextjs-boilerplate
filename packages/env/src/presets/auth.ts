import { z } from "zod";

import { booleanString, emptyToUndefined } from "../coerce.ts";

/**
 * Authentication and durable-jobs secrets.
 *
 * `BETTER_AUTH_SECRET` must be at least 32 characters — Better Auth refuses to
 * start with less, so catching it here fails the boot instead of the first
 * sign-in.
 */
export const auth = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  TRIGGER_ENABLED: booleanString.default(false),
  TRIGGER_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
});
