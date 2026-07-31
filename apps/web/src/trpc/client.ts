"use client";

import type { AppRouter } from "@repo/trpc/router";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

import { env } from "../env/client.ts";

function trpcUrl(): string {
  return `${env.NEXT_PUBLIC_APP_URL}/api/trpc`;
}

/** Browser tRPC client — credentials included for Better Auth session cookies. */
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: trpcUrl(),
      transformer: superjson,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
          signal: options?.signal ?? null,
        });
      },
    }),
  ],
});
