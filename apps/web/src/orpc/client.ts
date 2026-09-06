"use client";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import type { RouterClient } from "@orpc/server";

import type { AppRouter } from "@repo/orpc/router";

import { env } from "@/env/client.ts";

/**
 * Browser oRPC client — credentials included for Better Auth session cookies.
 *
 * Calls are POST-only (the RPC handler rejects GET). Cross-site cookie CSRF
 * is covered by SameSite=Lax session cookies plus that POST default; v2
 * removed the v1 custom-header CSRF plugin pair.
 */
const link = new RPCLink({
  origin: env.NEXT_PUBLIC_APP_URL,
  url: "/api/rpc",
  fetch: (url, init) => globalThis.fetch(url, { ...init, credentials: "include" }),
  plugins: [
    new BatchLinkPlugin({
      groups: [
        {
          condition: () => true,
          context: {},
        },
      ],
    }),
  ],
});

export const orpcClient: RouterClient<AppRouter> = createORPCClient(link);
