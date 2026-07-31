/**
 * Terminal job failures skip the remaining retry budget and go straight to the DLQ.
 *
 * BullMQ recognises `UnrecoverableError`; we re-export a thin wrapper so handlers
 * do not import BullMQ types directly from consumers.
 */

import { UnrecoverableError } from "bullmq";

export class TerminalJobError extends UnrecoverableError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "TerminalJobError";
    if (options?.cause !== undefined) {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Error.cause
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function isTerminalJobError(error: unknown): boolean {
  return error instanceof UnrecoverableError;
}
