import { createRouterClient } from "@orpc/server";

import type { OrpcContext } from "./context.ts";
import { assetsRouter } from "./routers/assets.ts";
import { billingRouter } from "./routers/billing.ts";

/** Merged app router — apps mount this or call via `createCaller`. */
export const appRouter = {
  billing: billingRouter,
  assets: assetsRouter,
};

export type AppRouter = typeof appRouter;

/** In-process caller for RSC and tests (no HTTP round-trip). */
export function createCallerFactory(router: AppRouter) {
  return (context: OrpcContext) => createRouterClient(router, { context });
}
