/**
 * Resolve a registered flag through a provider, failing open to the default.
 */

import { invariant } from "@repo/utils";

import { getFlagDefinition } from "./registry.ts";
import type { FlagContext, FlagProvider } from "./types.ts";

/**
 * Validates `name` against the registry, asks the provider, and on any throw
 * returns the declared default so a provider outage cannot take the product down.
 */
export async function resolveFlag(
  provider: FlagProvider,
  name: string,
  context?: FlagContext,
): Promise<boolean> {
  const definition = getFlagDefinition(name);
  invariant(definition !== undefined, `Unknown feature flag: ${name}`);

  try {
    return await provider.isEnabled(name, context);
  } catch {
    return definition.default;
  }
}
