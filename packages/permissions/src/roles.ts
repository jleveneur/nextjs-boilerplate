/**
 * Static role → permission grants.
 *
 * Roles are code-defined; `dynamicAccessControl` stays off (ADR-0005). Grants
 * are additive by seniority, so a change to `member` is inherited rather than
 * copied — the previous split across three files is what let `asset` reach
 * `@repo/authz` without ever reaching Better Auth.
 */

import type { OrganizationRole } from "@repo/types";

import { ALL_ACTIONS, PERMISSIONS, type Action } from "./registry.ts";

const MEMBER: readonly Action[] = [
  PERMISSIONS["invoice:create"],
  PERMISSIONS["invoice:read"],
  PERMISSIONS["invoice:update"],
  PERMISSIONS["invoice:export"],
  PERMISSIONS["billing:read"],
  PERMISSIONS["apiKey:list"],
  PERMISSIONS["asset:create"],
  PERMISSIONS["asset:read"],
];

const ADMIN: readonly Action[] = [
  ...MEMBER,
  PERMISSIONS["organization:update"],
  PERMISSIONS["member:create"],
  PERMISSIONS["member:update"],
  PERMISSIONS["member:delete"],
  PERMISSIONS["invitation:create"],
  PERMISSIONS["invitation:cancel"],
  PERMISSIONS["invoice:void"],
  PERMISSIONS["billing:manage"],
  PERMISSIONS["apiKey:create"],
  PERMISSIONS["apiKey:revoke"],
];

const OWNER: readonly Action[] = [...ADMIN, PERMISSIONS["organization:delete"]];

export const ROLE_PERMISSIONS: Record<OrganizationRole, readonly Action[]> = {
  member: MEMBER,
  admin: ADMIN,
  owner: OWNER,
};

export function permissionsForRole(role: OrganizationRole): readonly Action[] {
  return ROLE_PERMISSIONS[role];
}

export function roleHasPermission(role: OrganizationRole, action: Action): boolean {
  return ROLE_PERMISSIONS[role].includes(action);
}

export function isOrganizationRole(value: string): value is OrganizationRole {
  return value === "owner" || value === "admin" || value === "member";
}

/** Actions registered but missing from a grant set — used by the matrix guard. */
export function actionsMissingFrom(grants: readonly Action[]): Action[] {
  const set = new Set<Action>(grants);
  return ALL_ACTIONS.filter((action) => !set.has(action));
}

/**
 * Fail the suite if a registered action is missing from owner grants.
 *
 * A permission nobody can hold is dead code that reads like a feature, and the
 * failure mode is silent: the route exists, the check runs, everyone is denied.
 */
export function assertOwnerCoversAllActions(
  grants: readonly Action[] = ROLE_PERMISSIONS.owner,
): void {
  const missing = actionsMissingFrom(grants);
  if (missing.length > 0) {
    throw new Error(`Owner role is missing registered action: ${missing.join(", ")}`);
  }
}
