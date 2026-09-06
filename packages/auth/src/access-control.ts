/**
 * Organization access control for Better Auth.
 *
 * Better Auth wants `{ invoice: ["create", "void"] }`; the product declares
 * `"invoice:create"`. Rather than maintain both, this file *derives* the nested
 * shape from the flat registry in `@repo/permissions`, so `resource:action` stays
 * the only thing anyone edits and a new permission cannot reach session RBAC
 * while missing from API-key RBAC — which is exactly how `asset` ended up
 * enforced in one path and unknown to the other.
 *
 * Statements for `organization`, `member`, and `invitation` still come from the
 * plugin's own `defaultStatements` and `ownerAc`/`adminAc`/`memberAc`. They are
 * registered in `@repo/permissions` so `can()` sees one complete registry, and
 * `toStatements` filters them back out here; `access-control.test.ts` asserts our
 * grants for those resources still agree with what the plugin allows.
 */

import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

import { ROLE_PERMISSIONS, toStatements } from "@repo/permissions";

const statement = {
  ...defaultStatements,
  ...toStatements(ROLE_PERMISSIONS.owner),
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  ...toStatements(ROLE_PERMISSIONS.owner),
  ...ownerAc.statements,
});

export const admin = ac.newRole({
  ...toStatements(ROLE_PERMISSIONS.admin),
  ...adminAc.statements,
});

export const member = ac.newRole({
  ...toStatements(ROLE_PERMISSIONS.member),
  ...memberAc.statements,
});

export const organizationRoles = {
  owner,
  admin,
  member,
} as const;
