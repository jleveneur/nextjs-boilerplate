const NETWORK_ERROR = "Could not reach the server. Check your connection and try again.";

/** What every `authClient` call resolves to: `{ error }` on failure. */
type ActionResult = {
  error?: { message?: string | undefined } | null | undefined;
};

/**
 * Runs a server call as a TanStack Form submit validator.
 *
 * Better Auth reports failure by returning `{ error }` rather than throwing, so
 * the call belongs in `validators.onSubmitAsync` rather than the `onSubmit`
 * handler. Returning a `form` message is both what puts the text in
 * `errorMap.onSubmit` and what stops the success handler from running;
 * returning `null` lets it run.
 *
 * A rejected promise is a dead network rather than a refused request, which is
 * the one case Better Auth cannot report in its result.
 *
 * The empty `fields` is load-bearing, not decoration: TanStack Form only treats
 * a result as form-level when the key is present, so `{ form }` on its own is
 * stored whole and reaches the UI as an object instead of the message.
 */
export async function submitToServer(
  action: () => Promise<ActionResult>,
): Promise<{ form: string; fields: Record<string, never> } | null> {
  try {
    const { error } = await action();
    return error ? { form: error.message ?? "Something went wrong.", fields: {} } : null;
  } catch {
    return { form: NETWORK_ERROR, fields: {} };
  }
}

/**
 * Narrows `errorMap.onSubmit` to the message set by {@link submitToServer}.
 *
 * The same slot also holds the Zod result when a form-level schema fails, which
 * is a record keyed by field name — already rendered against each field, so
 * anything that is not a string is deliberately dropped here.
 */
export function serverError(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
