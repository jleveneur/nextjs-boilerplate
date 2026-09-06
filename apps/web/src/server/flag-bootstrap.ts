// oxlint-disable-next-line import/no-unassigned-import -- credential firewall
import "server-only";

import type { FlagProvider } from "@repo/core";
import {
  createEnvFlagProvider,
  createPostHogFlagProvider,
  hasFlagName,
  resolveFlag,
} from "@repo/flags";

export function createFlagPort(options: {
  flagValues?: Readonly<Record<string, boolean>>;
  posthogApiKey?: string;
  posthogHost?: string;
}): FlagProvider {
  const envProvider =
    options.flagValues === undefined
      ? createEnvFlagProvider()
      : createEnvFlagProvider({ values: options.flagValues });
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
