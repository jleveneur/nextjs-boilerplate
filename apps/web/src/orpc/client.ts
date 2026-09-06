"use client";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import type { RouterClient } from "@orpc/server";

import type { AppRouter } from "@repo/orpc/router";

/**
 * Browser oRPC client — credentials included for Better Auth session cookies.
 *
 * Calls are POST-only (the RPC handler rejects GET). Cross-site cookie CSRF
 * is covered by SameSite=Lax session cookies plus that POST default; v2
 * removed the v1 custom-header CSRF plugin pair.
 *
 * `origin` is resolved per request from the document, not from
 * `NEXT_PUBLIC_APP_URL`. A build-time origin is wrong the moment the app is
 * served from anywhere else — a preview deployment, an alternate domain — and
 * the failure is not obvious: the request becomes cross-origin, `SameSite=Lax`
 * withholds the session cookie, and every call returns 401.
 */
const link = new RPCLink({
  origin: () => {
    if (typeof window === "undefined") {
      // This module is `"use client"`, but client components still render on
      // the server. Reaching here means something imported the browser client
      // into a server path, where it would silently lose the session cookie.
      throw new Error("The browser oRPC client cannot be used on the server");
    }

    return window.location.origin;
  },
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
