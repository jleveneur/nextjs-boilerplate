import { describe, expectTypeOf, it } from "vitest";

import type { OrganizationId, UserId } from "@repo/types";
import type { z } from "zod";

import type { asOrganizationId, asUserId, organizationIdSchema, userIdSchema } from "./ids.ts";

describe("branded id schemas", () => {
  it("narrow to the branded id types", () => {
    expectTypeOf<z.infer<typeof organizationIdSchema>>().toEqualTypeOf<OrganizationId>();
    expectTypeOf<z.infer<typeof userIdSchema>>().toEqualTypeOf<UserId>();
    expectTypeOf<ReturnType<typeof asOrganizationId>>().toEqualTypeOf<OrganizationId>();
    expectTypeOf<ReturnType<typeof asUserId>>().toEqualTypeOf<UserId>();
  });

  it("keeps brands mutually unassignable", () => {
    expectTypeOf<OrganizationId>().not.toExtend<UserId>();
    expectTypeOf<UserId>().not.toExtend<OrganizationId>();
  });
});
