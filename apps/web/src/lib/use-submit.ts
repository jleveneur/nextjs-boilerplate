"use client";

import { useRef, useState } from "react";

const NETWORK_ERROR = "Could not reach the server. Check your connection and try again.";

/** What every `authClient` call resolves to: `{ data }` on success, `{ error }` on failure. */
export type ActionResult = {
  error?: { message?: string | undefined } | null | undefined;
};

/**
 * Runs one form submission at a time and owns its pending and error state.
 *
 * Every form in this app does the same three things: disable itself, await a
 * call that reports failure by returning `{ error }` rather than throwing, and
 * show whatever came back. Written out per form that duplicates the easy part
 * and gets the hard part wrong — a slow response arriving after the user has
 * submitted again would clear state it no longer owns, re-enabling a form
 * whose newer request is still in flight.
 *
 * The request id is what fixes that: only the most recent call writes state.
 */
export function useSubmit() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  async function run(action: () => Promise<ActionResult>, onSuccess?: () => void): Promise<void> {
    const id = ++latest.current;
    setPending(true);
    setError(null);

    let message: string | null = null;

    try {
      const result = await action();
      message = result.error ? (result.error.message ?? "Something went wrong.") : null;
    } catch {
      message = NETWORK_ERROR;
    } finally {
      if (id === latest.current) {
        setPending(false);
        setError(message);
      }
    }

    if (message === null && id === latest.current) {
      onSuccess?.();
    }
  }

  return { pending, error, run };
}
