import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createEnv } from "./create-env.ts";
import { base } from "./presets/base.ts";
import { db } from "./presets/db.ts";
import { otel } from "./presets/otel.ts";
import { publicApp } from "./presets/public.ts";
import { auth } from "./presets/auth.ts";

const validBase = {
  NODE_ENV: "development",
  APP_ENV: "local",
  APP_URL: "http://localhost:3000",
  LOG_LEVEL: "info",
} as const;

const validDb = {
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/app",
  DATABASE_POOL_SIZE: "10",
} as const;

describe("createEnv", () => {
  it("returns typed values for a composed server preset list", () => {
    const env = createEnv({
      server: [base, db],
      runtimeEnv: { ...validBase, ...validDb },
    });

    expect(env.DATABASE_URL).toBe(validDb.DATABASE_URL);
    expect(env.DATABASE_POOL_SIZE).toBe(10);
    expect(env.APP_ENV).toBe("local");
    expectTypeOf(env.DATABASE_URL).toEqualTypeOf<string>();
    expectTypeOf(env.DATABASE_POOL_SIZE).toEqualTypeOf<number>();
  });

  it("reports every invalid variable at once", () => {
    // One message, every problem — a first deploy must not become a guessing game.
    let message = "";
    expect(() =>
      createEnv({
        server: [base, db],
        runtimeEnv: {
          NODE_ENV: "development",
          APP_ENV: "local",
          // APP_URL missing
          DATABASE_URL: "not-a-url",
        },
        onValidationError: (formatted) => {
          message = formatted;
          throw new Error(formatted);
        },
      }),
    ).toThrow(/Invalid environment variables/);

    expect(message).toContain("APP_URL:");
    expect(message).toContain("DATABASE_URL:");
  });

  it("rejects a non-postgres DATABASE_URL", () => {
    expect(() =>
      createEnv({
        server: [db],
        runtimeEnv: { DATABASE_URL: "https://example.com/db" },
      }),
    ).toThrow(/postgres/);
  });

  it('coerces boolean strings and rejects the Boolean("false") trap', () => {
    const enabled = createEnv({
      server: [otel],
      runtimeEnv: {
        OTEL_ENABLED: "true",
        OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318",
      },
    });
    expect(enabled.OTEL_ENABLED).toBe(true);

    const disabled = createEnv({
      server: [otel],
      runtimeEnv: { OTEL_ENABLED: "false" },
    });
    expect(disabled.OTEL_ENABLED).toBe(false);

    expect(() =>
      createEnv({
        server: [otel],
        runtimeEnv: { OTEL_ENABLED: "yes" },
      }),
    ).toThrow(/OTEL_ENABLED/);
  });

  it("requires dependent variables when a feature flag is on", () => {
    expect(() =>
      createEnv({
        server: [otel],
        runtimeEnv: { OTEL_ENABLED: "true" },
      }),
    ).toThrow(/OTEL_EXPORTER_OTLP_ENDPOINT/);

    expect(() =>
      createEnv({
        server: [auth],
        runtimeEnv: {
          BETTER_AUTH_SECRET: "x".repeat(32),
          BETTER_AUTH_URL: "http://localhost:3000",
          TRIGGER_ENABLED: "true",
        },
      }),
    ).toThrow(/TRIGGER_SECRET_KEY/);
  });

  it("skips validation when SKIP_ENV_VALIDATION is set", () => {
    // Docker image builds reach here with secrets absent. Validation runs at
    // container start instead.
    const env = createEnv({
      server: [db],
      runtimeEnv: { SKIP_ENV_VALIDATION: "1" },
    });

    expect(env.DATABASE_URL).toBeUndefined();

    const also = createEnv({
      server: [db],
      runtimeEnv: {},
      skipValidation: true,
    });
    expect(also.DATABASE_URL).toBeUndefined();
  });

  it("rejects client keys that are not NEXT_PUBLIC_-prefixed", () => {
    // A secret in the client preset is unrecoverable once published.
    expect(() =>
      createEnv({
        client: z.object({ SECRET_KEY: z.string() }),
        runtimeEnv: { SECRET_KEY: "x" },
      }),
    ).toThrow(/NEXT_PUBLIC_/);
  });

  it("accepts a composed client preset", () => {
    const env = createEnv({
      client: [publicApp],
      runtimeEnv: {
        NEXT_PUBLIC_APP_URL: "https://app.example.com",
        NEXT_PUBLIC_APP_ENV: "production",
      },
    });

    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://app.example.com");
  });

  it("rejects localhost URLs when APP_ENV is production", () => {
    expect(() =>
      createEnv({
        server: [base, db],
        runtimeEnv: {
          NODE_ENV: "production",
          APP_ENV: "production",
          APP_URL: "http://localhost:3000",
          DATABASE_URL: "postgres://localhost/app",
        },
      }),
    ).toThrow(/localhost/);
  });

  it("rejects Stripe test keys when APP_ENV is production", () => {
    expect(() =>
      createEnv({
        server: [
          z.object({
            APP_ENV: z.enum(["local", "production"]),
            STRIPE_SECRET_KEY: z.string(),
          }),
        ],
        runtimeEnv: {
          APP_ENV: "production",
          STRIPE_SECRET_KEY: "sk_test_123",
        },
      }),
    ).toThrow(/Stripe test key/);
  });

  it("rejects dev- prefixed secrets in production", () => {
    expect(() =>
      createEnv({
        server: [
          z.object({
            APP_ENV: z.enum(["local", "production"]),
            BETTER_AUTH_SECRET: z.string(),
          }),
        ],
        runtimeEnv: {
          APP_ENV: "production",
          BETTER_AUTH_SECRET: "dev-not-for-production-use-at-all",
        },
      }),
    ).toThrow(/dev-/);
  });

  it("reads process.env when runtimeEnv is omitted", () => {
    const previous = process.env["APP_URL"];
    process.env["NODE_ENV"] = "test";
    process.env["APP_ENV"] = "test";
    process.env["APP_URL"] = "http://localhost:3000";
    process.env["LOG_LEVEL"] = "error";

    try {
      const env = createEnv({ server: [base] });
      expect(env.APP_URL).toBe("http://localhost:3000");
      expect(env.LOG_LEVEL).toBe("error");
    } finally {
      if (previous === undefined) {
        delete process.env["APP_URL"];
      } else {
        process.env["APP_URL"] = previous;
      }
    }
  });
});
