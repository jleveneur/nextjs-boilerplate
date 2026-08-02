// oxlint-disable-next-line import/no-unassigned-import -- credential firewall
import "server-only";

import type { FlagProvider } from "@repo/core";
import {
  bootstrapFlags,
  createEnvFlagProvider,
  createPostHogFlagProvider,
  hasFlagName,
  resolveFlag,
  type FlagBootstrap,
} from "@repo/flags";

import { env } from "../env/server.ts";

export function createFlagPort(options: {
  flagsJson?: string;
  posthogApiKey?: string;
  posthogHost?: string;
}): FlagProvider {
  const envProvider =
    options.flagsJson === undefined
      ? createEnvFlagProvider()
      : createEnvFlagProvider({ flagsJson: options.flagsJson });
  const posthogProvider =
    options.posthogApiKey !== undefined &&
    options.posthogApiKey !== "" &&
    options.posthogHost !== undefined
      ? createPostHogFlagProvider({
          apiKey: options.posthogApiKey,
          host: options.posthogHost,
        })
      : undefined;

  return {
    async isEnabled(flag, context) {
      if (!hasFlagName(flag)) {
        return false;
      }
      const provider = posthogProvider ?? envProvider;
      return resolveFlag(provider, flag, context);
    },
  };
}

/**
 * Server-evaluated flag set for client bootstrap (no flash of wrong variant).
 *
 * Uses env + flags only — must not call `getContainer()` from the root layout
 * (that opens Redis/auth and trips Next's prerender `Date.now()` guard).
 */
export function getBootstrappedFlags(): Promise<FlagBootstrap> {
  return bootstrapFlags(
    createFlagPort({
      ...(env.FLAGS_JSON === undefined ? {} : { flagsJson: env.FLAGS_JSON }),
      ...(env.POSTHOG_API_KEY === undefined ? {} : { posthogApiKey: env.POSTHOG_API_KEY }),
      ...(env.POSTHOG_HOST === undefined ? {} : { posthogHost: env.POSTHOG_HOST }),
    }),
  );
}
