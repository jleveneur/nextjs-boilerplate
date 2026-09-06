/**
 * App router composition root.
 *
 * The merged router lives in `@repo/orpc` (`appRouter`); this module is the
 * documented web-side import point so feature routers stay out of `apps/web`
 * until a second transport needs a different merge.
 */
// oxlint-disable-next-line import/no-unassigned-import -- credential firewall
import "server-only";

import { headers } from "next/headers";

import { appRouter, createCallerFactory } from "@repo/orpc";

import { createOrpcContext } from "./context.ts";
import { reportCallerFailure } from "./report-caller-failure.ts";

export { appRouter };

const createCaller = createCallerFactory(appRouter, reportCallerFailure);

/**
 * In-process caller scoped to the organization addressed by the URL.
 *
 * Returns the actor alongside it because a page usually needs both: the data,
 * and whether this actor may act on it (`canVoidInvoice` and friends). Without
 * the actor, callers had to rebuild the whole context by hand just to read it,
 * which is how one page ended up re-implementing this function inline.
 */
export async function createServerCaller(organizationSlug: string) {
  const requestHeaders = await headers();
  const context = await createOrpcContext(requestHeaders, { organizationSlug });
  return { api: createCaller(context), actor: context.actor };
}
