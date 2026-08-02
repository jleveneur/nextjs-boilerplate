/**
 * Browser PostHog helpers. Proxied through `/ingest` by default so blockers see
 * a first-party origin and CSP stays free of a third-party analytics host.
 */

import { posthog } from "posthog-js";

import { events, type EventName, type EventProperties } from "./events.ts";

export type InitPostHogBrowserOptions = {
  apiKey: string;
  /** Defaults to `/ingest` (Next rewrite → PostHog). */
  apiHost?: string;
};

export function initPostHogBrowser(options: InitPostHogBrowserOptions): void {
  posthog.init(options.apiKey, {
    api_host: options.apiHost ?? "/ingest",
    person_profiles: "identified_only",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
  });
}

/**
 * Validates against the typed registry, then captures in the browser.
 * No-ops until {@link initPostHogBrowser} has run.
 */
export function captureBrowser<Name extends EventName>(
  name: Name,
  properties: EventProperties<Name>,
): void {
  const parsed = events[name].parse(properties);
  posthog.capture(name, parsed);
}
