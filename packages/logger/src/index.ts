import { pino } from "pino"

import { env } from "@repo/env"

/**
 * Paths scrubbed from every log line.
 *
 * Redaction is configured here rather than left to call sites because the
 * dangerous case is the one nobody wrote deliberately: an error object or a
 * request that happens to carry a cookie, dragged into a log by `{ err }`.
 */
const REDACTED = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "*.password",
  "*.token",
  "*.secret",
  "*.authorization",
  "*.cookie",
  "headers.authorization",
  "headers.cookie",
]

/**
 * The application logger.
 *
 * JSON on stdout, with no transport. Pino's pretty-printing transport runs in
 * a worker thread, which Next's bundler does not reliably carry through a
 * build — and structured output is what a log aggregator wants anyway. For a
 * readable local stream, pipe it: `pnpm dev | pnpm dlx pino-pretty`.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  // ISO timestamps rather than epoch milliseconds: a line nobody can read at a
  // glance is a line nobody reads.
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    // `"level":"error"` instead of `"level":50`, for the same reason.
    level: (label) => ({ level: label }),
  },
  redact: { paths: REDACTED, censor: "[redacted]" },
})

export type Logger = typeof logger
