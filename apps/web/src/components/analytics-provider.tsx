"use client";

import { useEffect } from "react";

import { env } from "../env/client.ts";

/**
 * Boots PostHog in the browser when a public key is configured.
 * Capture goes through `/ingest` (first-party rewrite).
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  useEffect(() => {
    const apiKey = env.NEXT_PUBLIC_POSTHOG_KEY;
    if (apiKey === undefined || apiKey === "") {
      return;
    }
    void (async () => {
      const { initPostHogBrowser } = await import("@repo/analytics/client");
      initPostHogBrowser({
        apiKey,
        apiHost: "/ingest",
      });
    })();
  }, []);

  return children;
}
