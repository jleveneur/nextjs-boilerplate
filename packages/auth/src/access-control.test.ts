import { adminAc, memberAc, ownerAc } from "better-auth/plugins/organization/access";
import { describe, expect, it } from "vitest";

import { PERMISSIONS, ROLE_PERMISSIONS, productResources, toStatements } from "@repo/permissions";

import { ac, admin, member, organizationRoles, owner } from "./access-control.ts";

const ROLES = ["owner", "admin", "member"] as const;

/**
 * Better Auth types its statement maps as exact literals, so a runtime lookup by
 * a string the registry produced is not indexable. Reading through `Reflect.get`
 * keeps the assertion honest without widening anything to `any`.
 */
function grantsFor(statements: object, resource: string): readonly string[] {
  const value: unknown = Reflect.get(statements, resource);
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

describe("organization access control", () => {
  it("exposes owner, admin, and member roles", () => {
    expect(organizationRoles.owner).toBe(owner);
    expect(organizationRoles.admin).toBe(admin);
    expect(organizationRoles.member).toBe(member);
  });

  /**
   * The regression this file exists for. Session RBAC reads the flat registry
   * and API-key RBAC reads these statements; when the two were written by hand,
   * `asset` reached the first and never the second. Deriving both from one list
   * makes that impossible, and this asserts the derivation actually happened.
   */
  it("registers every product resource the permission registry declares", () => {
    for (const resource of productResources()) {
      expect(Object.keys(ac.statements), resource).toContain(resource);
    }
  });

  it("mirrors the registry's product grants exactly", () => {
    const expected = toStatements(ROLE_PERMISSIONS.owner);

    for (const [resource, actions] of Object.entries(expected)) {
      expect(grantsFor(ac.statements, resource), resource).toEqual(expect.arrayContaining(actions));
    }
  });

  it.each(ROLES)("gives %s the product grants the registry says it has", (role) => {
    const statements = organizationRoles[role].statements;

    for (const [resource, actions] of Object.entries(toStatements(ROLE_PERMISSIONS[role]))) {
      expect(grantsFor(statements, resource), `${role} ${resource}`).toEqual(
        expect.arrayContaining(actions),
      );
    }
  });

  /**
   * `organization`, `member`, and `invitation` are registered in
   * `@repo/permissions` so `can()` sees a complete registry, but Better Auth's
   * built-in roles are what actually enforce them. If our grants and the
   * plugin's ever disagree, one transport silently allows what the other denies.
   */
  it.each([
    ["owner", ownerAc.statements],
    ["admin", adminAc.statements],
    ["member", memberAc.statements],
  ] as const)("agrees with the plugin's built-in %s grants", (role, pluginStatements) => {
    const ours = toStatements(ROLE_PERMISSIONS[role], { includeBuiltIn: true });

    for (const resource of ["organization", "member", "invitation"] as const) {
      const registryGrants = ours[resource] ?? [];
      const pluginGrants = grantsFor(pluginStatements, resource);

      expect(registryGrants.toSorted(), `${role} ${resource}`).toEqual(pluginGrants.toSorted());
    }
  });

  it("still carries the statements the plugin needs for its own methods", () => {
    expect(ac.statements).toMatchObject({
      organization: expect.arrayContaining(["update", "delete"]),
      invoice: expect.arrayContaining([PERMISSIONS["invoice:create"].split(":")[1] ?? "", "void"]),
    });
  });
});
