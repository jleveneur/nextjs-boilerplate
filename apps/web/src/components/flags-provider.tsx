"use client";

import type { FlagBootstrap, FlagName } from "@repo/flags/registry";
import { createContext, useContext, type ReactNode } from "react";

const FlagsContext = createContext<FlagBootstrap | null>(null);

/**
 * Client flag values bootstrapped from the server (no flash of wrong variant).
 */
export function FlagsProvider({
  initialFlags,
  children,
}: {
  initialFlags: FlagBootstrap;
  children: ReactNode;
}): ReactNode {
  return <FlagsContext.Provider value={initialFlags}>{children}</FlagsContext.Provider>;
}

/** Synchronous flag read from the RSC-evaluated bootstrap set. */
export function useFlag(name: FlagName): boolean {
  const flags = useContext(FlagsContext);
  if (flags === null) {
    throw new Error("useFlag must be used within FlagsProvider");
  }
  return flags[name];
}
