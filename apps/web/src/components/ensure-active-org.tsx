"use client";

import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client.ts";

type Props = {
  orgSlug: string;
};

/**
 * Aligns Better Auth's active organization with the URL `[orgSlug]`.
 * Rendered as a sibling of `{children}` so the layout does not drop page
 * segments while this effect runs.
 */
export function EnsureActiveOrg({ orgSlug }: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    void (async () => {
      const { error: resultError } = await authClient.organization.setActive({
        organizationSlug: orgSlug,
      });
      if (cancelled) {
        return;
      }
      if (resultError) {
        setError(resultError.message ?? "Failed to activate organization");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgSlug]);

  if (error !== null) {
    return (
      <p className="text-destructive mb-4 text-sm" role="alert">
        {error}
      </p>
    );
  }

  return null;
}
