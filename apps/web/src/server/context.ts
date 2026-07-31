// oxlint-disable-next-line import/no-unassigned-import -- credential firewall
import "server-only";

import { resolveActor } from "@repo/auth";
import type { TrpcContext } from "@repo/trpc";

import { getContainer } from "./container.ts";

/** Build per-request tRPC context (session verified here, not in proxy). */
export async function createTrpcContext(headers: Headers): Promise<TrpcContext> {
  const { auth, db, logger, ports } = getContainer();
  const actor = (await resolveActor({ auth, headers })) ?? null;
  return { actor, db, logger, ports };
}
