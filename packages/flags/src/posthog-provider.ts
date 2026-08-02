/**
 * PostHog feature-flag provider. Fail-open: provider errors and missing flags
 * return the registry default so an outage cannot take the product down.
 */

import { PostHog } from "posthog-node";

import { getFlagDefinition } from "./registry.ts";
import type { FlagProvider } from "./types.ts";

export type CreatePostHogFlagProviderOptions = {
  apiKey: string;
  host: string;
};

function registryDefault(flag: string): boolean {
  return getFlagDefinition(flag)?.default ?? false;
}

export function createPostHogFlagProvider(
  options: CreatePostHogFlagProviderOptions,
): FlagProvider & { shutdown: () => Promise<void> } {
  const client = new PostHog(options.apiKey, { host: options.host });

  return {
    async isEnabled(flag, context) {
      try {
        const distinctId =
          context?.distinctId !== undefined && context.distinctId.length > 0
            ? context.distinctId
            : "anonymous";

        const flagOptions =
          context?.properties === undefined ? undefined : { personProperties: context.properties };
        const value = await client.getFeatureFlag(flag, distinctId, flagOptions);

        if (value === undefined || value === null) {
          return registryDefault(flag);
        }

        if (typeof value === "boolean") {
          return value;
        }

        // String variant keys count as enabled when truthy and not the literal "false".
        return value !== "false" && value !== "";
      } catch {
        return registryDefault(flag);
      }
    },
    shutdown() {
      return client.shutdown();
    },
  };
}
