/**
 * Organization access control for Better Auth.
 *
 * Re-declares default org statements and composes roles from adminAc/memberAc
 * so built-in plugin methods keep working (docs/architecture/07-auth.md).
 */

import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

const statement = {
  ...defaultStatements,
  invoice: ["create", "read", "update", "void", "export"],
  billing: ["read", "manage"],
  apiKey: ["create", "revoke", "list"],
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  invoice: ["create", "read", "update", "void", "export"],
  billing: ["read", "manage"],
  apiKey: ["create", "revoke", "list"],
  ...ownerAc.statements,
});

export const admin = ac.newRole({
  invoice: ["create", "read", "update", "void", "export"],
  billing: ["read", "manage"],
  apiKey: ["create", "revoke", "list"],
  ...adminAc.statements,
});

export const member = ac.newRole({
  invoice: ["create", "read", "update", "export"],
  billing: ["read"],
  apiKey: ["list"],
  ...memberAc.statements,
});

export const organizationRoles = {
  owner,
  admin,
  member,
} as const;
