/**
 * Request-scoped logger storage.
 *
 * A child logger is bound per request (or job) and stored here so deep call
 * sites can call {@link getLogger} without threading the logger through every
 * signature — without a global mutable logger that leaks context between
 * concurrent requests.
 */

import { AsyncLocalStorage } from "node:async_hooks";

import type { Logger } from "./types.ts";

const storage = new AsyncLocalStorage<Logger>();

/** Active request/job logger, if {@link runWithLogger} is on the stack. */
export function getLogger(): Logger | undefined {
  return storage.getStore();
}

/**
 * Runs `fn` with `logger` as the ambient logger for the async call tree.
 */
export function runWithLogger<T>(logger: Logger, fn: () => T): T {
  return storage.run(logger, fn);
}
