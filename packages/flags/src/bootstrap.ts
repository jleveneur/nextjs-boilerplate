/**
 * Evaluate every registered flag once for RSC → client bootstrap.
 */

import { flags, hasFlagName, type FlagBootstrap, type FlagName } from "./registry.ts";
import { resolveFlag } from "./evaluate.ts";
import type { FlagContext, FlagProvider } from "./types.ts";

export type { FlagBootstrap };

function registeredFlagNames(): FlagName[] {
  const names: FlagName[] = [];
  for (const name of Object.keys(flags)) {
    if (hasFlagName(name)) {
      names.push(name);
    }
  }
  return names;
}

function isCompleteBootstrap(value: Partial<Record<FlagName, boolean>>): value is FlagBootstrap {
  for (const name of registeredFlagNames()) {
    if (typeof value[name] !== "boolean") {
      return false;
    }
  }
  return true;
}

/** Resolve the full registry through `provider` (fail-open per flag). */
export async function bootstrapFlags(
  provider: FlagProvider,
  context?: FlagContext,
): Promise<FlagBootstrap> {
  const names = registeredFlagNames();
  const bootstrapped: Partial<Record<FlagName, boolean>> = {};

  await Promise.all(
    names.map(async (name) => {
      bootstrapped[name] = await resolveFlag(provider, name, context);
    }),
  );

  if (!isCompleteBootstrap(bootstrapped)) {
    throw new Error("Incomplete feature-flag bootstrap");
  }

  return bootstrapped;
}
