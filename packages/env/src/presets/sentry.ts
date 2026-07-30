import { z } from "zod";

import { booleanString, emptyToUndefined } from "../coerce.ts";

/** Sentry server SDK. The browser DSN is {@link sentryClient}. */
export const sentry = z.object({
  SENTRY_ENABLED: booleanString.default(false),
  SENTRY_DSN: z.preprocess(emptyToUndefined, z.url().optional()),
  SENTRY_ENVIRONMENT: z.string().min(1).optional(),
});

/** Sentry browser DSN — public by design; the DSN alone cannot read events. */
export const sentryClient = z.object({
  NEXT_PUBLIC_SENTRY_DSN: z.url(),
});
