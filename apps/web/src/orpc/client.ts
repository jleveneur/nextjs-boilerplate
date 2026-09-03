"use client";

import type { RouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin, SimpleCsrfProtectionLinkPlugin } from "@orpc/client/plugins";
import type { AppRouter } from "@repo/orpc/router";

import { env } from "../env/client.ts";

function rpcUrl(): string {
  return `${env.NEXT_PUBLIC_APP_URL}/api/rpc`;
}

/**
 * Browser oRPC client — credentials included for Better Auth session cookies.
 * The CSRF plugin sends `x-csrf-token`, so cookie-authenticated calls cannot
 * be issued from a cross-site HTML form.
 */
const link = new RPCLink({
  url: rpcUrl(),
  fetch: (request, init) => globalThis.fetch(request, { ...init, credentials: "include" }),
  plugins: [
    new SimpleCsrfProtectionLinkPlugin(),
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
