/**
 * Exhaustiveness checking for discriminated unions.
 *
 * Placed in the `default` branch of a switch, it turns "someone added a variant
 * and forgot to handle it here" from a silent fallthrough into a compile error at
 * every site that needs updating. `noFallthroughCasesInSwitch` catches missing
 * `break`; only this catches a missing `case`.
 */

import { programmerError } from "./invariant.ts";

/**
 * Fails to compile if `value` is reachable, and throws if it is reached anyway.
 *
 * ```ts
 * switch (status) {
 *   case "active":
 *     return renderActive();
 *   case "suspended":
 *     return renderSuspended();
 *   default:
 *     return assertNever(status); // error here the moment a third status exists
 * }
 * ```
 *
 * The runtime throw is not redundant. The compile-time check only holds while the
 * value's type is honest, and it stops being honest at every boundary the compiler
 * cannot see: a database column with a new enum member, a JSON payload from an
 * older client, a cast someone added under deadline.
 *
 * @param value The variable whose union should be exhausted. When a variant is
 *   unhandled, the compiler reports it as not assignable to `never` and names it.
 * @param subject What is being switched on, used in the message. Worth passing —
 *   "unhandled subscription status" is diagnosable, "unhandled variant" is not.
 * @throws Error named `INVARIANT_VIOLATION_NAME`, always.
 */
export function assertNever(value: never, subject = "variant"): never {
  throw programmerError(`Unhandled ${subject}: ${describe(value)}`);
}

/**
 * Renders an unexpected value for the error message.
 *
 * Discriminants are strings or numbers in practice, so this is nearly always a
 * plain stringify. The object cases exist because the value arriving here is by
 * definition not what the types promised, and a message reading
 * `Unhandled status: [object Object]` wastes the one diagnostic this throw
 * provides. Kept to a shallow summary rather than a full serialisation: the value
 * reaches logs, and a whole row from an unexpected branch may carry personal data
 * that `@repo/logger`'s redaction never gets to see.
 *
 * Takes `unknown` rather than `never`. `never` is the compile-time claim that this
 * is unreachable; `unknown` is what is actually in the variable once it has been
 * reached. Narrowing a `never` yields error types, so the honest parameter type is
 * the one that describes runtime.
 */
function describe(value: unknown): string {
  // Each case narrows positively rather than by elimination. TypeScript does not
  // reduce `unknown` as typeof checks rule possibilities out, so a trailing
  // `String(value)` would still be operating on `unknown` — the exact situation
  // that produces "[object Object]" in a message meant to identify a value.
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (typeof value === "symbol") return value.toString();
  if (typeof value === "function") {
    return `function ${value.name === "" ? "anonymous" : value.name}`;
  }

  const name = value.constructor?.name ?? "object";
  const keys = Object.keys(value);

  return keys.length === 0 ? name : `${name} { ${keys.join(", ")} }`;
}
