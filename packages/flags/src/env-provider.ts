/**
 * Env-backed flag provider.
 *
 * The composition root passes the `FLAGS_JSON` blob (validated by `@repo/env`) —
 * this module never reads `process.env` itself.
 */

import { z } from "zod";

import { getFlagDefinition } from "./registry.ts";
import type { FlagProvider } from "./types.ts";

const flagsJsonSchema = z.record(z.string(), z.boolean());

export type CreateEnvFlagProviderOptions = {
  /**
   * Raw JSON object string, typically from `FLAGS_JSON`
   * (e.g. `{"new-billing-portal":true}`).
   */
  flagsJson?: string;
  /** Pre-parsed overrides. Merged over {@link flagsJson} when both are set. */
  values?: Readonly<Record<string, boolean>>;
};

export function createEnvFlagProvider(options: CreateEnvFlagProviderOptions = {}): FlagProvider {
  let overrides: Record<string, boolean> = {};

  if (options.flagsJson !== undefined && options.flagsJson.trim() !== "") {
    const parsed: unknown = JSON.parse(options.flagsJson);
    overrides = flagsJsonSchema.parse(parsed);
  }

  if (options.values !== undefined) {
    overrides = { ...overrides, ...options.values };
  }

  return {
    isEnabled(flag) {
      if (Object.hasOwn(overrides, flag)) {
        return Promise.resolve(overrides[flag] === true);
      }

      const definition = getFlagDefinition(flag);
      return Promise.resolve(definition?.default ?? false);
    },
  };
}
