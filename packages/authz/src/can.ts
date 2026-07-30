/**
 * Pure authorization check.
 *
 * Deny by default. Record-level tenant matching applies when `resource` carries
 * an `organizationId`. Feature policies in `@repo/core` compose on top of this.
 */

import { ERROR_CODES } from "@repo/errors";
import type { Actor, OrganizationId } from "@repo/types";

import { allow, deny, type Decision } from "./decision.ts";
import { ALL_ACTIONS, DESTRUCTIVE_WHILE_IMPERSONATING, type Action } from "./permissions.ts";

export type AuthzResource = {
  organizationId: OrganizationId;
};

function isRegisteredAction(action: string): action is Action {
  return (ALL_ACTIONS as readonly string[]).includes(action);
}

export function can(actor: Actor, action: Action, resource?: AuthzResource): Decision {
  if (!isRegisteredAction(action)) {
    return deny(`Unknown action: ${String(action)}`, ERROR_CODES.FORBIDDEN);
  }

  if (actor.isSystem) {
    // Cross-tenant access is intentional for SystemCtx; repositories still scope explicitly.
    return allow();
  }

  if (actor.isImpersonating === true && DESTRUCTIVE_WHILE_IMPERSONATING.has(action)) {
    return deny(`Action ${action} is barred during impersonation`, ERROR_CODES.FORBIDDEN);
  }

  if (!actor.permissions.includes(action)) {
    return deny(`Missing permission: ${action}`, ERROR_CODES.FORBIDDEN);
  }

  if (resource !== undefined && resource.organizationId !== actor.organizationId) {
    return deny("Resource belongs to another organization", ERROR_CODES.FORBIDDEN);
  }

  return allow();
}
