/**
 * Assertion for conditions that must hold if the program is correct.
 *
 * Replaces the non-null assertion operator. `user!.email` narrows the type and
 * produces `Cannot read properties of undefined` somewhere unrelated; an
 * `invariant` fails at the point the assumption broke and says which assumption
 * it was. The type narrowing is identical, so nothing is lost by preferring it.
 *
 * An invariant failure is a bug, never an expected outcome. Anything a user or a
 * third party can trigger is a validation or domain error and belongs in
 * `@repo/errors` — not here.
 */

/**
 * `name` on the thrown error, so a failure can be recognised without a
 * dependency on this package.
 *
 * `@repo/errors` is also layer 0 and therefore unreachable from here, so the
 * error mapper — which sits above both and maps this to `InternalError` — matches
 * on the name. That is the seam, and it is why the string is exported rather than
 * inlined: matching on a message would break the first time someone rewords one.
 */
export const INVARIANT_VIOLATION_NAME = "InvariantViolation";

/**
 * Throws unless `condition` is truthy, narrowing it for the rest of the scope.
 *
 * ```ts
 * const member = await findMember(id);
 * invariant(member, `member ${id} vanished mid-transaction`);
 * member.role; // narrowed, no `!`
 * ```
 *
 * @param message What was assumed, phrased so the failure is diagnosable from the
 *   log line alone. "member exists" describes the check; "member ${id} vanished
 *   mid-transaction" describes the bug.
 * @throws Error named {@link INVARIANT_VIOLATION_NAME} when `condition` is falsy.
 */
export function invariant(condition: unknown, message: string): asserts condition {
  if (condition) return;

  throw programmerError(message);
}

/**
 * Builds the error thrown by every assertion in this package.
 *
 * Internal: exported for `assertNever`, deliberately absent from the package
 * barrel. Callers should be throwing through an assertion, not constructing these
 * directly — and both failures arrive at the error mapper looking identical.
 */
export function programmerError(message: string): Error {
  const error = new Error(message);
  error.name = INVARIANT_VIOLATION_NAME;

  return error;
}
