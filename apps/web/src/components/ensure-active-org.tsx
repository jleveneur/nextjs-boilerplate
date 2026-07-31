"use client";

import { Skeleton } from "@repo/ui";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { authClient } from "../lib/auth-client.ts";

type Props = {
  orgSlug: string;
  children: ReactNode;
};

/** Ensures the Better Auth active organization matches the URL `[orgSlug]` before rendering. */
export function EnsureActiveOrg({ orgSlug, children }: Props) {
  const [readySlug, setReadySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    void (async () => {
      const { error: resultError } = await authClient.organization.setActive({
        organizationSlug: orgSlug,
      });
      if (cancelled) return;
      if (resultError) {
        setError(resultError.message ?? "Failed to activate organization");
        return;
      }
      setReadySlug(orgSlug);
    })();

    return () => {
      cancelled = true;
    };
  }, [orgSlug]);

  if (error !== null) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {error}
      </p>
    );
  }

  if (readySlug !== orgSlug) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return children;
}
