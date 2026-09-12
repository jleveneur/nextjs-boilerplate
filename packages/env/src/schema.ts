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

  /**
   * Resend API key. Optional on purpose: without it, mail is appended to a
   * local outbox instead of being delivered, so a fresh clone can complete
   * sign-up, verification, and invitations before anyone has a Resend account.
   * Set it in every environment that has real users.
   */
  RESEND_API_KEY: z.string().min(1).optional(),

  /**
   * Sender address. The default is Resend's sandbox sender, which only
   * delivers to the address that owns the account — enough to try the flows,
   * not enough to ship. Point it at a verified domain before launch.
   */
  EMAIL_FROM: z.email().default("onboarding@resend.dev"),

  /** Where the local outbox is written when `RESEND_API_KEY` is unset. */
  MAIL_OUTBOX_DIR: z.string().min(1).optional(),

  /**
   * Log verbosity. `debug` and `trace` are for chasing something specific —
   * leaving them on in production is how a log bill becomes a surprise.
   */
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  /**
   * Better Auth's per-IP rate limiting.
   *
   * On by default, and it should stay on anywhere real people sign in — it is
   * what makes credential stuffing expensive. Turned off only for automated
   * suites, which hammer sign-up and sign-in from a single address and would
   * otherwise be throttled partway through.
   *
   * Better Auth infers this from `NODE_ENV`; it is spelled out here because a
   * limit nobody can see is a limit nobody tunes when they move behind a proxy.
   */
  AUTH_RATE_LIMIT: z.enum(["on", "off"]).default("on"),
};

/**
 * Browser environment variables. Every key must start with `NEXT_PUBLIC_` —
 * t3-env enforces that at the type level and again at runtime.
 *
 * Anything added here is inlined into the JavaScript bundle at build time, so
 * a secret placed in this object is published, not configured.
 */
export const client = {};
