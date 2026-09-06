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

/** Reports a failure that crossed this boundary. Must not throw or swallow. */
export type CallerFailureReporter = (error: unknown, path: ReadonlyArray<string | number>) => void;

/**
 * In-process caller for RSC and tests (no HTTP round-trip).
 *
 * `onFailure` exists because this path has no HTTP layer to observe it. A
 * Server Component calling a service in-process bypasses the RPC route
 * entirely, so its failures reach Next's `error.tsx` and nothing else — an
 * incident nobody records. The RPC route already logs and reports; this gives
 * the RSC path the same treatment rather than a second blind spot.
 */
export function createCallerFactory(router: AppRouter, onFailure?: CallerFailureReporter) {
  return (context: OrpcContext) =>
    createRouterClient(router, {
      context,
      ...(onFailure === undefined
        ? {}
        : {
            interceptors: [
              async (options) => {
                try {
                  return await options.next();
                } catch (error) {
                  onFailure(error, options.path);
                  throw error;
                }
              },
            ],
          }),
    });
}
