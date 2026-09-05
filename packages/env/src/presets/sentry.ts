import { z } from "zod";

import { booleanString } from "../coerce.ts";
import { definePreset } from "../merge-presets.ts";

/** Sentry server SDK. The browser DSN is {@link sentryClient}. */
export const sentry = definePreset(
  z.object({
    SENTRY_ENABLED: booleanString.default(false),
    SENTRY_DSN: z.url().optional(),
    SENTRY_ENVIRONMENT: z.string().min(1).optional(),
    /** Release tag — typically the git SHA. */
    SENTRY_RELEASE: z.string().min(1).optional(),
  }),
  (env) => {
    if (env["SENTRY_ENABLED"] === true && env["SENTRY_DSN"] === undefined) {
      return ["SENTRY_DSN: required when SENTRY_ENABLED is true"];
    }
    return [];
  },
);

/** Sentry browser DSN — public by design; the DSN alone cannot read events. */
export const sentryClient = z.object({
  NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
});
