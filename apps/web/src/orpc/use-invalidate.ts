"use client";

import { useQueryClient, type QueryKey } from "@tanstack/react-query";

/**
 * Invalidate one or more oRPC query keys after a mutation.
 *
 * `useQueryClient` cannot be hoisted out of a component: the client comes from
 * React context, and in SSR it is per-request — a module-level one would share
 * a cache between users. tRPC's `useUtils()` has the same constraint; what it
 * adds is the ergonomics, which is what this restores.
 *
 * ```ts
 * const invalidate = useInvalidate();
 * // in onSuccess:
 * await invalidate(orpc.billing.list.key(), orpc.billing.get.key({ input }));
 * ```
 *
 * Returns a single promise so `onSuccess` can await the whole refetch rather
 * than resolving while some queries are still stale.
 */
export function useInvalidate(): (...queryKeys: readonly QueryKey[]) => Promise<void> {
  const queryClient = useQueryClient();

  return async (...queryKeys) => {
    await Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  };
}
