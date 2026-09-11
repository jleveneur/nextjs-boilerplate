import { z } from "zod";

/**
 * Server-side environment variables.
 *
 * Kept separate from `createEnv` so the rules can be tested without validating
 * the real `process.env` as a side effect of importing them.
 */
export const server = {
  DATABASE_URL: z
    .string()
    .refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), {
      message: "must be a postgres:// or postgresql:// URL",
    }),

  /** Better Auth refuses to start below 32 characters, so fail here instead. */
  BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),

  /**
   * Public origin of the app. Better Auth signs callback URLs with it.
   *
   * The protocol is constrained because a bare `z.url()` accepts
   * `localhost:3000` — the scheme-less form everyone types first parses as a
   * URL whose protocol is `localhost:`, and the breakage surfaces later as
   * cookies that never stick.
   */
  BETTER_AUTH_URL: z.url({
    protocol: /^https?$/,
    error: "must be an http:// or https:// URL",
  }),
};

/**
 * Browser environment variables. Every key must start with `NEXT_PUBLIC_` —
 * t3-env enforces that at the type level and again at runtime.
 *
 * Anything added here is inlined into the JavaScript bundle at build time, so
 * a secret placed in this object is published, not configured.
 */
export const client = {};
