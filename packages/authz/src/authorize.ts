import { ForbiddenError } from "@repo/errors";
import type { Actor } from "@repo/types";

import { can, type AuthzResource } from "./can.ts";
import type { Action } from "./permissions.ts";

/**
 * Authorize or throw. Use in application services before any read/write.
 */
export function authorize(actor: Actor, action: Action, resource?: AuthzResource): void {
  const decision = can(actor, action, resource);
  if (decision.allowed) {
    return;
  }

  throw new ForbiddenError({
    message: decision.reason,
    code: decision.code,
    context: {
      action,
      userId: actor.userId,
      organizationId: actor.organizationId,
    },
  });
}
