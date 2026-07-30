/**
 * Type assertions for branding.
 *
 * These are the real tests for this package. Branding has no runtime behaviour to
 * assert — a `UserId` is a string at runtime — so the only way to know the brand
 * works is to check what the compiler accepts and rejects. A brand that silently
 * accepts a plain string still compiles, still passes every runtime test, and
 * provides none of the protection it was added for.
 */

import { assertType, describe, expectTypeOf, it } from "vitest";

import type { Brand, Unbrand } from "./brand.ts";

type UserId = Brand<string, "UserId">;
type OrganizationId = Brand<string, "OrganizationId">;
type Count = Brand<number, "Count">;

describe("Brand", () => {
  it("is assignable to its underlying type", () => {
    // A branded value is still usable everywhere the raw type is expected, so
    // adding a brand never forces a cast at the serialisation boundary.
    expectTypeOf<UserId>().toExtend<string>();
    expectTypeOf<Count>().toExtend<number>();
  });

  it("is not assignable from its underlying type", () => {
    // The point of the exercise: a bare string cannot become a UserId by accident.
    expectTypeOf<string>().not.toExtend<UserId>();
    // @ts-expect-error a plain string is not a UserId
    assertType<UserId>("u_01JQ");
  });

  it("keeps two brands over the same base mutually unassignable", () => {
    // This is the cross-tenant bug it exists to prevent.
    expectTypeOf<UserId>().not.toExtend<OrganizationId>();
    expectTypeOf<OrganizationId>().not.toExtend<UserId>();
  });

  it("retains the methods of the underlying type", () => {
    // Intersected rather than wrapped, so branded values are not crippled.
    expectTypeOf<UserId>().toHaveProperty("toUpperCase");
    expectTypeOf<UserId>().toHaveProperty("length");
    expectTypeOf<Count>().toHaveProperty("toFixed");
  });

  it("can be produced by an explicit assertion", () => {
    // The escape hatch is deliberate: constructing a branded value should be a
    // visible act, confined to validators in @repo/utils.
    const id = "u_01JQ" as UserId;
    expectTypeOf(id).toEqualTypeOf<UserId>();
  });
});

describe("Unbrand", () => {
  it("recovers the underlying type", () => {
    expectTypeOf<Unbrand<UserId>>().toEqualTypeOf<string>();
    expectTypeOf<Unbrand<Count>>().toEqualTypeOf<number>();
  });

  it("leaves unbranded types alone", () => {
    // So it is safe to apply generically at a boundary without knowing whether a
    // given field is branded.
    expectTypeOf<Unbrand<string>>().toEqualTypeOf<string>();
    expectTypeOf<Unbrand<{ a: 1 }>>().toEqualTypeOf<{ a: 1 }>();
  });
});
