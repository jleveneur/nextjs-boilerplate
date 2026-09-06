/**
 * Stale-flag enforcement: non-permanent flags past their `expires` date.
 */

import { flags, getFlagDefinition, hasFlagName, type FlagName } from "./registry.ts";

export type ExpiredFlag = {
  name: FlagName;
  expires: string;
  owner: string;
  kind: "release" | "experiment";
};

/**
 * Returns release/experiment flags whose `expires` calendar day is strictly
 * before `now`'s UTC date. Kill-switches have no expiry and are never listed.
 */
export function listExpiredFlags(now: Date): ExpiredFlag[] {
  const today = now.toISOString().slice(0, 10);
  const expired: ExpiredFlag[] = [];

  for (const name of Object.keys(flags)) {
    if (!hasFlagName(name)) {
      continue;
    }
    const definition = getFlagDefinition(name);
    if (definition === undefined) {
      continue;
    }
    if (definition.kind === "kill-switch") {
      continue;
    }

    if (!("expires" in definition)) {
      continue;
    }

    if (definition.expires < today) {
      expired.push({
        name,
        expires: definition.expires,
        owner: definition.owner,
        kind: definition.kind,
      });
    }
  }

  return expired;
}
