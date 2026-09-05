import { z } from "zod";

import { definePreset } from "../merge-presets.ts";

/**
 * Authentication secrets.
 *
 * `BETTER_AUTH_SECRET` must be at least 32 characters — Better Auth refuses to
 * start with less, so catching it here fails the boot instead of the first
 * sign-in.
 *
 * OAuth client credentials are optional locally (providers are skipped when
 * unset) and should be set in any environment that offers GitHub/Google sign-in.
 */
export const auth = definePreset(
  z.object({
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  }),
  (env) => {
    const problems: string[] = [];

    if (env["GITHUB_CLIENT_ID"] !== undefined && env["GITHUB_CLIENT_SECRET"] === undefined) {
      problems.push("GITHUB_CLIENT_SECRET: required when GITHUB_CLIENT_ID is set");
    }

    if (env["GITHUB_CLIENT_SECRET"] !== undefined && env["GITHUB_CLIENT_ID"] === undefined) {
      problems.push("GITHUB_CLIENT_ID: required when GITHUB_CLIENT_SECRET is set");
    }

    if (env["GOOGLE_CLIENT_ID"] !== undefined && env["GOOGLE_CLIENT_SECRET"] === undefined) {
      problems.push("GOOGLE_CLIENT_SECRET: required when GOOGLE_CLIENT_ID is set");
    }

    if (env["GOOGLE_CLIENT_SECRET"] !== undefined && env["GOOGLE_CLIENT_ID"] === undefined) {
      problems.push("GOOGLE_CLIENT_ID: required when GOOGLE_CLIENT_SECRET is set");
    }

    return problems;
  },
);
