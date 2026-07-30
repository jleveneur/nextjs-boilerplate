/**
 * Nominal typing for TypeScript's structural type system.
 *
 * TypeScript compares types by shape, so every `string` is interchangeable with
 * every other `string`. That is fine until the strings mean different things:
 *
 *   function addMember(organizationId: string, userId: string): void;
 *   addMember(userId, organizationId); // compiles, and is a cross-tenant bug
 *
 * A brand attaches a phantom property that exists only in the type system, which
 * makes the two mutually unassignable while remaining a plain string at runtime.
 */

/**
 * The phantom key. A `unique symbol` rather than a string literal so no object
 * can collide with it, and `declare` so it never reaches the emitted output —
 * branding costs nothing at runtime.
 */
declare const brand: unique symbol;

/**
 * `Base` tagged with `Tag`, assignable to `Base` but not from it.
 *
 * ```ts
 * type UserId = Brand<string, "UserId">;
 *
 * const id = "u_123" as UserId;
 * const raw: string = id;   // fine: a UserId *is* a string
 * const bad: UserId = "u_1"; // error: a string is not a UserId
 * ```
 *
 * `readonly` so a brand cannot be assigned away, and intersected rather than
 * wrapped so branded values keep every method of the underlying type.
 *
 * The payload records `base` alongside `tag` so `Unbrand` can recover the
 * underlying type. Inferring it from the intersection instead — `T extends
 * Base & {...} ? Base : never` — resolves to `never`, because TypeScript cannot
 * reliably infer one member of an intersection it is matching against.
 */
export type Brand<Base, Tag extends string> = Base & {
  readonly [brand]: { base: Base; tag: Tag };
};

/**
 * The unbranded type behind a brand.
 *
 * For serialisation boundaries, where a branded value has to become a plain value
 * again — a JSON body, a SQL parameter, a URL segment.
 *
 * ```ts
 * type Raw = Unbrand<UserId>; // string
 * ```
 *
 * Leaves unbranded types untouched, so it is safe to apply at a boundary without
 * knowing which fields are branded.
 */
export type Unbrand<T> = T extends { readonly [brand]: { base: infer Base } } ? Base : T;
