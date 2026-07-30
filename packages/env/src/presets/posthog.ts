import { z } from "zod";

/** PostHog server-side capture. The public key lives in {@link posthogClient}. */
export const posthog = z.object({
  POSTHOG_API_KEY: z.string().min(1),
  POSTHOG_HOST: z.url(),
});

/** PostHog browser key — the only PostHog value that may reach a client bundle. */
export const posthogClient = z.object({
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1),
  NEXT_PUBLIC_POSTHOG_HOST: z.url(),
});
