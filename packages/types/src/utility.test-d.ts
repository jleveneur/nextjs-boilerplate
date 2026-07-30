/**
 * Type assertions for the utility types.
 *
 * Each case pins the behaviour the type was added for, so a "simplification"
 * that quietly changes it fails here rather than somewhere downstream.
 */

import { assertType, describe, expectTypeOf, it } from "vitest";

import type {
  ArrayElement,
  Awaitable,
  DeepReadonly,
  NonEmptyArray,
  Prettify,
  RequireAtLeastOne,
} from "./utility.ts";

describe("Prettify", () => {
  it("preserves the members of an intersection", () => {
    // Flattening is for readability, so the one thing it must not do is change
    // the type.
    expectTypeOf<Prettify<{ a: string } & { b: number }>>().toEqualTypeOf<{
      a: string;
      b: number;
    }>();
  });

  it("keeps optionality", () => {
    expectTypeOf<Prettify<{ a?: string }>>().toEqualTypeOf<{ a?: string }>();
  });
});

describe("NonEmptyArray", () => {
  it("types the first element as present", () => {
    // The reason it exists: no `| undefined` on a known-present element, even
    // under noUncheckedIndexedAccess.
    const items: NonEmptyArray<string> = ["a"];
    expectTypeOf(items[0]).toEqualTypeOf<string>();
  });

  it("rejects an empty array", () => {
    // @ts-expect-error an empty array is not a NonEmptyArray
    assertType<NonEmptyArray<string>>([]);
  });

  it("is still an array", () => {
    expectTypeOf<NonEmptyArray<string>>().toExtend<string[]>();
  });
});

describe("Awaitable", () => {
  it("accepts a value or a promise of it", () => {
    assertType<Awaitable<number>>(1);
    assertType<Awaitable<number>>(Promise.resolve(1));
  });

  it("rejects the wrong value type", () => {
    // @ts-expect-error string is not Awaitable<number>
    assertType<Awaitable<number>>("1");
  });
});

describe("DeepReadonly", () => {
  it("applies through nested objects", () => {
    // `readonly` alone stops at the first level, which is the bug this fixes.
    expectTypeOf<DeepReadonly<{ a: { b: string } }>>().toEqualTypeOf<{
      readonly a: { readonly b: string };
    }>();
  });

  it("applies to arrays", () => {
    expectTypeOf<DeepReadonly<string[]>>().toEqualTypeOf<readonly string[]>();
  });

  it("leaves functions callable", () => {
    // Mapping over a function's properties would destroy its call signature.
    expectTypeOf<DeepReadonly<() => string>>().toEqualTypeOf<() => string>();
  });
});

describe("RequireAtLeastOne", () => {
  type Filter = RequireAtLeastOne<{ name?: string; email?: string }>;

  it("accepts one or more keys", () => {
    assertType<Filter>({ name: "a" });
    assertType<Filter>({ email: "b" });
    assertType<Filter>({ name: "a", email: "b" });
  });

  it("rejects an empty object", () => {
    // A filter that narrows by nothing returns everything — usually not intended.
    // @ts-expect-error at least one key is required
    assertType<Filter>({});
  });
});

describe("ArrayElement", () => {
  it("extracts the element type", () => {
    expectTypeOf<ArrayElement<string[]>>().toEqualTypeOf<string>();
  });

  it("works on a readonly tuple, which is how const arrays are inferred", () => {
    const locales = ["en", "fr"] as const;
    expectTypeOf<ArrayElement<typeof locales>>().toEqualTypeOf<"en" | "fr">();
  });
});
