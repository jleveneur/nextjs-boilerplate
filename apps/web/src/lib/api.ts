import { createRouterClient } from "@orpc/server"
import { headers } from "next/headers"

import { appRouter, createContext } from "@repo/api"

/**
 * Server-side caller for Server Components and Route Handlers.
 *
 * Calls the router in process — no HTTP round trip, no serialization — while
 * still going through the same procedures and authorization as a browser call.
 * The context is built per call from the incoming request's headers.
 */
export const api = createRouterClient(appRouter, {
  context: async () => createContext(await headers()),
})
