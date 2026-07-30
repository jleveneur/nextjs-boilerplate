import { assertType, describe, expectTypeOf, it } from "vitest";

import type { Actor, OrganizationRole, Permission } from "./actor.ts";
import type { OrganizationId, UserId } from "./ids.ts";

describe("Actor", () => {
  it("requires branded ids and a known role", () => {
    expectTypeOf<Actor["userId"]>().toEqualTypeOf<UserId>();
    expectTypeOf<Actor["organizationId"]>().toEqualTypeOf<OrganizationId>();
    expectTypeOf<Actor["role"]>().toEqualTypeOf<OrganizationRole>();
    expectTypeOf<Actor["permissions"]>().toEqualTypeOf<readonly Permission[]>();
  });

  it("rejects a free string as OrganizationRole", () => {
    // @ts-expect-error free strings are not OrganizationRole
    assertType<OrganizationRole>("superadmin");
  });
});
