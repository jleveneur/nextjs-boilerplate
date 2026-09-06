/**
 * Mirrors the getter Next generates into `.next/types/root-params.d.ts`.
 * tsgolint does not load that generated file, so the declaration lives here.
 *
 * `undefined` is in the union because `/api/*` is a second root layout without
 * a `[locale]` segment.
 */
declare module "next/root-params" {
  export function locale(): Promise<string | undefined>;
}
