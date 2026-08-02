/**
 * Typed feature-flag registry.
 *
 * Flags declare a kind, default, owner, and (for non-permanent kinds) an expiry.
 * Kill-switches are permanent; release and experiment flags must expire or CI fails.
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

export const flags = {
  "new-billing-portal": {
    kind: "release",
    default: false,
    owner: "@platform",
    expires: "2027-12-31",
  },
  "disable-exports": {
    kind: "kill-switch",
    default: false,
    owner: "@platform",
  },
} as const satisfies Record<string, FlagDefinition>;

export type FlagName = keyof typeof flags;

export function hasFlagName(name: string): name is FlagName {
  return name in flags;
}

export function getFlagDefinition(name: string): FlagDefinition | undefined {
  return hasFlagName(name) ? flags[name] : undefined;
}
