import { z } from "zod";

import { optionalUrl } from "../coerce.ts";
import { definePreset } from "../merge-presets.ts";

/** PostHog server-side capture. The public key lives in {@link posthogClient}. */
export const posthog = definePreset(
  z.object({
    POSTHOG_API_KEY: z.string().min(1).optional(),
    POSTHOG_HOST: optionalUrl,
  }),
  (env) => {
    if (env["POSTHOG_API_KEY"] !== undefined && env["POSTHOG_HOST"] === undefined) {
      return ["POSTHOG_HOST: required when POSTHOG_API_KEY is set"];
    }
    return [];
  },
);

/** PostHog browser key — the only PostHog value that may reach a client bundle. */
export const posthogClient = definePreset(
  z.object({
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: optionalUrl,
  }),
  (env) => {
    if (
      env["NEXT_PUBLIC_POSTHOG_KEY"] !== undefined &&
      env["NEXT_PUBLIC_POSTHOG_HOST"] === undefined
    ) {
      return ["NEXT_PUBLIC_POSTHOG_HOST: required when NEXT_PUBLIC_POSTHOG_KEY is set"];
    }
    return [];
  },
);
