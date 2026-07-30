/**
 * Baseline server configuration every Node process needs.
 *
 * Apps compose this first: `createEnv({ server: [base, db, …] })`. It includes
 * the shared identity variables plus process-level logging.
 */

import { z } from "zod";

import { shared } from "./shared.ts";

export const logLevels = ["fatal", "error", "warn", "info", "debug", "trace"] as const;

export const base = z.object({
  ...shared.shape,
  LOG_LEVEL: z.enum(logLevels).default("info"),
});
