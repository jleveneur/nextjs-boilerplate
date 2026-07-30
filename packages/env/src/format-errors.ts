/**
 * Formats a Zod failure into one message listing every invalid variable.
 *
 * Deploying with three missing secrets and discovering them one restart at a
 * time is how first deploys become guessing games. One message, every problem.
 */

import type { z } from "zod";

/**
 * Renders every issue as `VAR: reason`, sorted by variable name so the output
 * is stable across runs and greppable in CI logs.
 */
export function formatEnvErrors(error: z.ZodError): string {
  const lines = error.issues
    .map((issue) => {
      const path = issue.path.length === 0 ? "(root)" : issue.path.join(".");
      return `  ${path}: ${issue.message}`;
    })
    .toSorted();

  return ["Invalid environment variables:", ...lines].join("\n");
}
