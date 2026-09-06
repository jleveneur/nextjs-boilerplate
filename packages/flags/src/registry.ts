/**
 * Typed feature-flag registry.
 *
 * Flags declare a kind, default, owner, and (for non-permanent kinds) an expiry.
 * Kill-switches are permanent; release and experiment flags must expire or CI fails.
 *
 * The registry is empty until a real rollout needs a flag. Dummy flags that
 * hide shipped product (or gate features that do not exist) are not registered.
 */

export type FlagKind = "release" | "experiment" | "kill-switch";

type ReleaseOrExperimentFlag = {
  kind: "release" | "experiment";
  default: boolean;
  owner: string;
  expires: string;
};

type KillSwitchFlag = {
  kind: "kill-switch";
  default: boolean;
  owner: string;
};

export type FlagDefinition = ReleaseOrExperimentFlag | KillSwitchFlag;

export const flags = {} as const satisfies Record<string, FlagDefinition>;

export type FlagName = keyof typeof flags;

/** Server-evaluated set passed to the client (no flash of the wrong variant). */
export type FlagBootstrap = Readonly<Record<FlagName, boolean>>;

export function hasFlagName(name: string): name is FlagName {
  return name in flags;
}

export function getFlagDefinition(name: string): FlagDefinition | undefined {
  return hasFlagName(name) ? flags[name] : undefined;
}
