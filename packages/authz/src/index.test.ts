import { describe, expect, it } from "vitest"

import { isRole, roleNames, roles } from "./index.ts"

describe("organization roles", () => {
  it("lets every role create a post", () => {
    for (const name of roleNames) {
      expect(roles[name].authorize({ post: ["create"] }).success).toBe(true)
    }
  })

  it("only lets owners and admins delete a post", () => {
    expect(roles.owner.authorize({ post: ["delete"] }).success).toBe(true)
    expect(roles.admin.authorize({ post: ["delete"] }).success).toBe(true)
    expect(roles.member.authorize({ post: ["delete"] }).success).toBe(false)
  })

  it("keeps the plugin's own grants: only owners delete the organization", () => {
    expect(roles.owner.authorize({ organization: ["delete"] }).success).toBe(true)
    expect(roles.admin.authorize({ organization: ["delete"] }).success).toBe(false)
    expect(roles.member.authorize({ organization: ["delete"] }).success).toBe(false)
  })

  it("keeps the plugin's own grants: members cannot invite", () => {
    expect(roles.admin.authorize({ invitation: ["create"] }).success).toBe(true)
    expect(roles.member.authorize({ invitation: ["create"] }).success).toBe(false)
  })
})

describe("isRole", () => {
  it("accepts the known roles", () => {
    expect(roleNames.every((name) => isRole(name))).toBe(true)
  })

  it("rejects anything else", () => {
    expect(isRole("superuser")).toBe(false)
    expect(isRole("")).toBe(false)
  })
})
