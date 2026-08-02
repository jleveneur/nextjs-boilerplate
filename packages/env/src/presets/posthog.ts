import { z } from "zod";

import { emptyToUndefined, optionalUrl } from "../coerce.ts";

/** PostHog server-side capture. The public key lives in {@link posthogClient}. */
export const posthog = z.object({
  POSTHOG_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  POSTHOG_HOST: optionalUrl,
});

/** PostHog browser key — the only PostHog value that may reach a client bundle. */
export const posthogClient = z.object({
  NEXT_PUBLIC_POSTHOG_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  NEXT_PUBLIC_POSTHOG_HOST: optionalUrl,
});
