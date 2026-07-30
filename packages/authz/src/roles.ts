/**
 * Static role → permission grants.
 *
 * Composed to mirror Better Auth org `adminAc`/`memberAc` plus our product
 * statements. `dynamicAccessControl` stays off (ADR-0005).
 */

import type { OrganizationRole, Permission } from "@repo/types";

import { ALL_ACTIONS, PERMISSIONS, type Action } from "./permissions.ts";

const memberPermissions: readonly Action[] = [
  PERMISSIONS["invoice:create"],
  PERMISSIONS["invoice:read"],
  PERMISSIONS["invoice:update"],
  PERMISSIONS["invoice:export"],
  PERMISSIONS["apiKey:list"],
];

const adminPermissions: readonly Action[] = [
  ...memberPermissions,
  PERMISSIONS["organization:update"],
  PERMISSIONS["member:create"],
  PERMISSIONS["member:update"],
  PERMISSIONS["member:delete"],
  PERMISSIONS["invitation:create"],
  PERMISSIONS["invitation:cancel"],
  PERMISSIONS["invoice:void"],
  PERMISSIONS["apiKey:create"],
  PERMISSIONS["apiKey:revoke"],
];

const ownerPermissions: readonly Action[] = [
  ...adminPermissions,
  PERMISSIONS["organization:delete"],
];

export const ROLE_PERMISSIONS: Record<OrganizationRole, readonly Action[]> = {
  member: memberPermissions,
  admin: adminPermissions,
  owner: ownerPermissions,
};

/** Every action an owner can perform — used to assert registry completeness. */
export function permissionsForRole(role: OrganizationRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function roleHasPermission(role: OrganizationRole, action: Action): boolean {
  return ROLE_PERMISSIONS[role].includes(action);
}

/** Actions registered but missing from a grant set — used by the matrix guard. */
export function actionsMissingFrom(grants: readonly Action[]): Action[] {
  const set = new Set<Action>(grants);
  return ALL_ACTIONS.filter((action) => !set.has(action));
}

/**
 * Fail the build/test suite if a registered action is missing from owner grants
 * (owners must be able to do everything in the product registry).
 */
export function assertOwnerCoversAllActions(
  grants: readonly Action[] = ROLE_PERMISSIONS.owner,
): void {
  const missing = actionsMissingFrom(grants);
  if (missing.length > 0) {
    throw new Error(`Owner role is missing registered action: ${missing.join(", ")}`);
  }
}
