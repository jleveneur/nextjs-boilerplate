/**
 * PostHog server-side capture via posthog-node.
 */

import { PostHog } from "posthog-node";

import { createNoopAnalyticsSink } from "./noop-sink.ts";
import type { AnalyticsSink } from "./types.ts";

export type CreateAnalyticsSinkOptions = {
  apiKey?: string | undefined;
  host?: string | undefined;
};

export type CreatePostHogAnalyticsSinkOptions = {
  apiKey: string;
  host: string;
  /**
   * Used when properties do not include `distinctId`. Prefer passing
   * `distinctId` per event when the actor is known.
   */
  distinctId?: string;
};

export function createPostHogAnalyticsSink(
  options: CreatePostHogAnalyticsSinkOptions,
): AnalyticsSink & { flush: () => Promise<void>; shutdown: () => Promise<void> } {
  const client = new PostHog(options.apiKey, { host: options.host });

  return {
    capture(event, properties) {
      const fromProps = properties?.["distinctId"];
      const distinctId =
        typeof fromProps === "string" && fromProps.length > 0
          ? fromProps
          : (options.distinctId ?? "anonymous");

      const rest =
        properties === undefined
          ? undefined
          : Object.fromEntries(Object.entries(properties).filter(([key]) => key !== "distinctId"));

      client.capture({
        distinctId,
        event,
        ...(rest === undefined || Object.keys(rest).length === 0 ? {} : { properties: rest }),
      });
      return Promise.resolve();
    },
    flush() {
      return client.flush();
    },
    shutdown() {
      return client.shutdown();
    },
  };
}

/** Select the configured production sink, defaulting to a no-op sink. */
export function createAnalyticsSink(options: CreateAnalyticsSinkOptions): AnalyticsSink {
  return options.apiKey === undefined || options.apiKey === "" || options.host === undefined
    ? createNoopAnalyticsSink()
    : createPostHogAnalyticsSink({ apiKey: options.apiKey, host: options.host });
}
