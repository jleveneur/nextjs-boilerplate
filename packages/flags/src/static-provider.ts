/**
 * Explicit values per test case.
 */

import { getFlagDefinition } from "./registry.ts";
import type { FlagProvider } from "./types.ts";

export function createStaticFlagProvider(
  values: ReadonlyMap<string, boolean> | Readonly<Record<string, boolean>>,
): FlagProvider {
  const map: ReadonlyMap<string, boolean> =
    values instanceof Map ? values : new Map(Object.entries(values));

  return {
    isEnabled(flag) {
      if (map.has(flag)) {
        return Promise.resolve(map.get(flag) === true);
      }

      const definition = getFlagDefinition(flag);
      return Promise.resolve(definition?.default ?? false);
    },
  };
}
