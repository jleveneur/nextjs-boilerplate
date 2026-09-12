"use client"

import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import type { RouterClient } from "@orpc/server"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"

import type { AppRouter } from "@repo/api/router"

/**
 * Browser oRPC client.
 *
 * A same-origin path, not an absolute URL: the request then works unchanged on
 * every preview deployment and custom domain, and the session cookie rides
 * along because same-origin requests send it by default.
 */
const link = new RPCLink({ url: "/api/rpc" })

const client: RouterClient<AppRouter> = createORPCClient(link)

/** Typed TanStack Query helpers: `orpc.post.list.queryOptions()`, and so on. */
export const orpc = createTanstackQueryUtils(client)
