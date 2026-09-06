/**
 * Next ships `next/root-params` as a shorthand ambient declaration with no body
 * (`declare module 'next/root-params'`), which makes every export `any`. The real
 * getter is generated into `.next/types/root-params.d.ts`, but that file is absent
 * on a fresh CI checkout, and even when present it loses to the shorthand because
 * the first declaration seen takes precedence.
 *
 * Declaring it here wins, and exists before `next typegen` has run.
 */
declare module "next/root-params" {
  export function locale(): Promise<string>;
}
