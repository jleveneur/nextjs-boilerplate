/**
 * App router composition root.
 *
 * The merged router lives in `@repo/orpc` (`appRouter`); this module is the
 * documented web-side import point so feature routers stay out of `apps/web`
 * until a second transport needs a different merge.
 */
// oxlint-disable-next-line import/no-unassigned-import -- credential firewall
import "server-only";

import { appRouter, createCallerFactory } from "@repo/orpc";
import { headers } from "next/headers";

import { createOrpcContext } from "./context.ts";

export { appRouter };

const createCaller = createCallerFactory(appRouter);

/** Create an in-process caller scoped to the organization addressed by the URL. */
export async function createServerCaller(organizationSlug: string) {
  const requestHeaders = await headers();
  const context = await createOrpcContext(requestHeaders, { organizationSlug });
  return createCaller(context);
}
