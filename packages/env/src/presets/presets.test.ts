import { describe, expect, it } from "vitest";

import { createEnv } from "../create-env.ts";
import { auth } from "./auth.ts";
import { base } from "./base.ts";
import { db } from "./db.ts";
import { otel } from "./otel.ts";
import { posthog, posthogClient } from "./posthog.ts";
import { publicApp, stripeClient } from "./public.ts";
import { redis } from "./redis.ts";
import { resend } from "./resend.ts";
import { s3 } from "./s3.ts";
import { sentry, sentryClient } from "./sentry.ts";
import { stripe } from "./stripe.ts";

describe("presets", () => {
  it("compose a full worker-shaped server env", () => {
    // Tuple form keeps field types; `combine(...)` would widen to Preset.
    const env = createEnv({
      server: [base, db, redis, s3, resend, otel, posthog, sentry, auth, stripe],
      runtimeEnv: {
        NODE_ENV: "production",
        APP_ENV: "staging",
        APP_URL: "https://staging.example.com",
        LOG_LEVEL: "info",
        DATABASE_URL: "postgresql://user:pass@db.example.com:5432/app",
        DATABASE_POOL_SIZE: "20",
        REDIS_URL: "rediss://cache.example.com:6379",
        S3_ENDPOINT: "https://s3.example.com",
        S3_REGION: "auto",
        S3_BUCKET: "app",
        S3_ACCESS_KEY_ID: "key",
        S3_SECRET_ACCESS_KEY: "secret",
        RESEND_API_KEY: "re_abc",
        EMAIL_FROM: "noreply@example.com",
        OTEL_ENABLED: "false",
        POSTHOG_API_KEY: "phc_abc",
        POSTHOG_HOST: "https://eu.posthog.com",
        SENTRY_ENABLED: "false",
        BETTER_AUTH_SECRET: "s".repeat(32),
        BETTER_AUTH_URL: "https://staging.example.com",
        STRIPE_SECRET_KEY: "sk_live_abc",

        STRIPE_WEBHOOK_SECRET: "whsec_abc",
      },
    });

    expect(env.REDIS_URL.startsWith("rediss://")).toBe(true);
    expect(env.DATABASE_POOL_SIZE).toBe(20);
  });

  it("rejects a non-redis REDIS_URL", () => {
    expect(() =>
      createEnv({
        server: [redis],
        runtimeEnv: { REDIS_URL: "https://example.com" },
      }),
    ).toThrow(/redis/);

    // Invalid URL must not throw out of the refine callback.
    expect(() =>
      createEnv({
        server: [redis],
        runtimeEnv: { REDIS_URL: "not-a-url" },
      }),
    ).toThrow(/REDIS_URL/);
  });

  it("requires SENTRY_DSN when Sentry is enabled", () => {
    expect(() =>
      createEnv({
        server: [sentry],
        runtimeEnv: { SENTRY_ENABLED: "true" },
      }),
    ).toThrow(/SENTRY_DSN/);
  });

  it("accepts client analytics and error-tracking presets", () => {
    const env = createEnv({
      client: [publicApp, posthogClient, sentryClient, stripeClient],
      runtimeEnv: {
        NEXT_PUBLIC_APP_URL: "https://app.example.com",
        NEXT_PUBLIC_APP_ENV: "production",
        NEXT_PUBLIC_POSTHOG_KEY: "phc_x",
        NEXT_PUBLIC_POSTHOG_HOST: "https://eu.posthog.com",
        NEXT_PUBLIC_SENTRY_DSN: "https://a@b.ingest.sentry.io/1",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc",
      },
    });

    expect(env.NEXT_PUBLIC_POSTHOG_KEY).toBe("phc_x");
    expect(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).toBe("pk_test_abc");
  });

  it("rejects a non-pk Stripe publishable key", () => {
    expect(() =>
      createEnv({
        client: [stripeClient],
        runtimeEnv: { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "sk_test_abc" },
      }),
    ).toThrow(/pk_/);
  });

  it("treats empty optional strings as absent", () => {
    const env = createEnv({
      server: [sentry],
      runtimeEnv: {
        SENTRY_ENABLED: "false",
        SENTRY_DSN: "",
      },
    });

    expect(env.SENTRY_DSN).toBeUndefined();
  });
});
