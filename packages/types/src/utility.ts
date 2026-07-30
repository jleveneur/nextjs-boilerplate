/**
 * Utility types.
 *
 * Deliberately few. A large utility-type collection becomes its own dialect that
 * every reader has to learn, and most entries get used once. Each type here earns
 * its place by removing a specific, recurring problem.
 */

/**
 * Flattens a type into a single object literal.
 *
 * Intersections and mapped types are displayed by TypeScript as the expression
 * that produced them, so a hover or an error message shows
 * `Omit<User, "id"> & { id: UserId } & Timestamps` instead of the fields. Wrapping
 * the result makes tooltips and diagnostics readable, which is most of what makes
 * a shared type usable.
 */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/**
 * An array guaranteed to have at least one element.
 *
 * Lets `array[0]` be typed as present rather than `T | undefined`, so a caller
 * that has already established non-emptiness does not have to re-check it — and
 * one that has not is forced to.
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * A value, or a promise of it.
 *
 * For extension points where a caller may be synchronous: a feature-flag
 * resolver, a policy function, a test fake. The implementer chooses; the caller
 * awaits either way.
 */
export type Awaitable<T> = T | Promise<T>;

/**
 * A recursively immutable view of a value.
 *
 * For frozen configuration and registries, where a mutation would be a bug
 * discovered somewhere unrelated. `readonly` alone stops only the top level.
 */
export type DeepReadonly<T> = T extends (infer Element)[]
  ? readonly DeepReadonly<Element>[]
  : T extends (...args: never[]) => unknown
    ? T
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

/**
 * Requires at least one of `Keys` to be present.
 *
 * For options objects where every field is optional but an empty object is
 * meaningless — a filter that must narrow by something, an update that must
 * change something.
 */
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Prettify<
  Omit<T, Keys> & { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys]
>;

/**
 * The element type of an array or readonly array.
 *
 * Names one member of a collection without exporting a second type that can
 * drift from it: `type Locale = ArrayElement<typeof LOCALES>`.
 */
export type ArrayElement<T> = T extends readonly (infer Element)[] ? Element : never;
