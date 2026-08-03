/**
 * Maps org roles to `resource:action` permission strings for {@link Actor}.
 *
 * Kept in sync with `@repo/authz` ROLE_PERMISSIONS — auth must not import authz.
 */

import type { OrganizationRole, Permission } from "@repo/types";

const member: readonly Permission[] = [
  "invoice:create",
  "invoice:read",
  "invoice:update",
  "invoice:export",
  "billing:read",
  "apiKey:list",
];

const admin: readonly Permission[] = [
  ...member,
  "organization:update",
  "member:create",
  "member:update",
  "member:delete",
  "invitation:create",
  "invitation:cancel",
  "invoice:void",
  "billing:manage",
  "apiKey:create",
  "apiKey:revoke",
];

const owner: readonly Permission[] = [...admin, "organization:delete"];

const byRole: Record<OrganizationRole, readonly Permission[]> = {
  member,
  admin,
  owner,
};

export function permissionsForOrganizationRole(role: OrganizationRole): readonly Permission[] {
  return byRole[role];
}

export function isOrganizationRole(value: string): value is OrganizationRole {
  return value === "owner" || value === "admin" || value === "member";
}
