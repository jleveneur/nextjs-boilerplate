/**
 * Request context assembled at the composition root and passed into oRPC.
 *
 * Resolvers never resolve sessions themselves — the edge does that and places
 * an {@link Actor} (or `null`) here before procedures run.
 */

import type { Ctx, CtxPorts } from "@repo/core";
import type { Database } from "@repo/db";
import type { Logger } from "@repo/logger";
import type { Actor } from "@repo/types";

export type OrpcContext = {
  actor: Actor | null;
  db: Database;
  logger: Logger;
  ports: CtxPorts;
};

/** Build the core service ctx once an org-scoped procedure has an actor. */
export function toServiceCtx(ctx: OrpcContext & { actor: Actor }): Ctx {
  return {
    actor: ctx.actor,
    db: ctx.db,
    logger: ctx.logger,
    ports: ctx.ports,
  };
}
