import { createAccessControl } from "better-auth/plugins/access"
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access"

/**
 * Every permission in the product, as `resource: [action, ...]`.
 *
 * `defaultStatements` covers the organization plugin's own resources —
 * `organization`, `member`, `invitation`. Product resources are added beside
 * them, so there is exactly one list of what can be done in this application.
 */
export const statement = {
  ...defaultStatements,
  post: ["create", "delete"],
} as const

export const ac = createAccessControl(statement)

/**
 * Roles, from least to most privileged.
 *
 * Each starts from the plugin's own grants for the organization resources and
 * then adds the product ones, so changing a role here cannot silently diverge
 * from what the plugin allows for membership and invitations.
 */
export const member = ac.newRole({
  ...memberAc.statements,
  post: ["create"],
})

export const admin = ac.newRole({
  ...adminAc.statements,
  post: ["create", "delete"],
})

export const owner = ac.newRole({
  ...ownerAc.statements,
  post: ["create", "delete"],
})

export const roles = { owner, admin, member }

export const roleNames = ["owner", "admin", "member"] as const

export type Role = (typeof roleNames)[number]

/**
 * Narrows the `role` string stored on a member row.
 *
 * The column is plain text, so a role written by an older deploy — or by hand —
 * has to be checked before it is used to look up grants.
 */
export function isRole(value: string): value is Role {
  return roleNames.some((role) => role === value)
}
