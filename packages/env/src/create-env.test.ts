import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createEnv } from "./create-env.ts";
import { auth } from "./presets/auth.ts";
import { base } from "./presets/base.ts";
import { db } from "./presets/db.ts";
import { featureFlags } from "./presets/flags.ts";
import { otel } from "./presets/otel.ts";
import { posthog, posthogClient } from "./presets/posthog.ts";
import { publicApp, stripeClient } from "./presets/public.ts";
import { resend } from "./presets/resend.ts";
import { smtp } from "./presets/smtp.ts";
import { stripe } from "./presets/stripe.ts";

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

const unsetAuthOauth = {
  GITHUB_CLIENT_ID: undefined,
  GITHUB_CLIENT_SECRET: undefined,
  GOOGLE_CLIENT_ID: undefined,
  GOOGLE_CLIENT_SECRET: undefined,
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
          APP_URL: undefined,
          LOG_LEVEL: undefined,
          DATABASE_URL: "not-a-url",
          DATABASE_POOL_SIZE: undefined,
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
        runtimeEnv: { DATABASE_URL: "https://example.com/db", DATABASE_POOL_SIZE: undefined },
      }),
    ).toThrow(/postgres/);
  });

  it("requires every schema key on runtimeEnv at the type level", () => {
    createEnv({
      server: [db],
      // @ts-expect-error DATABASE_POOL_SIZE must be listed even when it has a default
      runtimeEnv: { DATABASE_URL: validDb.DATABASE_URL },
    });
  });

  it('coerces boolean strings and rejects the Boolean("false") trap', () => {
    const enabled = createEnv({
      server: [otel],
      runtimeEnv: {
        OTEL_ENABLED: "true",
        OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318",
        OTEL_SERVICE_NAME: undefined,
      },
    });
    expect(enabled.OTEL_ENABLED).toBe(true);

    const disabled = createEnv({
      server: [otel],
      runtimeEnv: {
        OTEL_ENABLED: "false",
        OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
        OTEL_SERVICE_NAME: undefined,
      },
    });
    expect(disabled.OTEL_ENABLED).toBe(false);

    expect(() =>
      createEnv({
        server: [otel],
        runtimeEnv: {
          OTEL_ENABLED: "yes",
          OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
          OTEL_SERVICE_NAME: undefined,
        },
      }),
    ).toThrow(/OTEL_ENABLED/);
  });

  it("treats empty strings as unset so defaults apply", () => {
    const env = createEnv({
      server: [otel],
      runtimeEnv: {
        OTEL_ENABLED: "",
        OTEL_EXPORTER_OTLP_ENDPOINT: "",
        OTEL_SERVICE_NAME: "",
      },
    });

    expect(env.OTEL_ENABLED).toBe(false);
    expect(env.OTEL_EXPORTER_OTLP_ENDPOINT).toBeUndefined();
    expect(env.OTEL_SERVICE_NAME).toBe("app");
  });

  it("requires dependent variables when a feature flag is on", () => {
    expect(() =>
      createEnv({
        server: [otel],
        runtimeEnv: {
          OTEL_ENABLED: "true",
          OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
          OTEL_SERVICE_NAME: undefined,
        },
      }),
    ).toThrow(/OTEL_EXPORTER_OTLP_ENDPOINT/);

    expect(() =>
      createEnv({
        server: [auth],
        runtimeEnv: {
          BETTER_AUTH_SECRET: "x".repeat(32),
          BETTER_AUTH_URL: "http://localhost:3000",
          GITHUB_CLIENT_ID: "gh-id",
          GITHUB_CLIENT_SECRET: undefined,
          GOOGLE_CLIENT_ID: undefined,
          GOOGLE_CLIENT_SECRET: undefined,
        },
      }),
    ).toThrow(/GITHUB_CLIENT_SECRET/);

    expect(() =>
      createEnv({
        server: [auth],
        runtimeEnv: {
          BETTER_AUTH_SECRET: "x".repeat(32),
          BETTER_AUTH_URL: "http://localhost:3000",
          GITHUB_CLIENT_ID: undefined,
          GITHUB_CLIENT_SECRET: "gh-secret",
          GOOGLE_CLIENT_ID: undefined,
          GOOGLE_CLIENT_SECRET: undefined,
        },
      }),
    ).toThrow(/GITHUB_CLIENT_ID/);

    expect(() =>
      createEnv({
        server: [auth],
        runtimeEnv: {
          BETTER_AUTH_SECRET: "x".repeat(32),
          BETTER_AUTH_URL: "http://localhost:3000",
          GITHUB_CLIENT_ID: undefined,
          GITHUB_CLIENT_SECRET: undefined,
          GOOGLE_CLIENT_ID: "google-id",
          GOOGLE_CLIENT_SECRET: undefined,
        },
      }),
    ).toThrow(/GOOGLE_CLIENT_SECRET/);

    expect(() =>
      createEnv({
        server: [auth],
        runtimeEnv: {
          BETTER_AUTH_SECRET: "x".repeat(32),
          BETTER_AUTH_URL: "http://localhost:3000",
          ...unsetAuthOauth,
          GOOGLE_CLIENT_SECRET: "google-secret",
        },
      }),
    ).toThrow(/GOOGLE_CLIENT_ID/);
  });

  it("skips validation when SKIP_ENV_VALIDATION is set", () => {
    // Docker image builds reach here with secrets absent. Validation runs at
    // container start instead.
    const env = createEnv({
      server: [db],
      runtimeEnv: {
        DATABASE_URL: undefined,
        DATABASE_POOL_SIZE: undefined,
        SKIP_ENV_VALIDATION: "1",
      },
    });

    expect(env.DATABASE_URL).toBeUndefined();

    const also = createEnv({
      server: [db],
      runtimeEnv: { DATABASE_URL: undefined, DATABASE_POOL_SIZE: undefined },
      skipValidation: true,
    });
    expect(also.DATABASE_URL).toBeUndefined();
  });

  it("returns only schema keys when validation is skipped", () => {
    const runtimeEnv = {
      DATABASE_URL: validDb.DATABASE_URL,
      DATABASE_POOL_SIZE: "1",
      EXTRA: "should-not-leak",
    };

    const env = createEnv({
      server: [db],
      skipValidation: true,
      runtimeEnv,
    });

    expect(env).toEqual({
      DATABASE_URL: validDb.DATABASE_URL,
      DATABASE_POOL_SIZE: "1",
    });
    expect(env).not.toHaveProperty("EXTRA");
  });

  it("rejects client keys that are not NEXT_PUBLIC_-prefixed", () => {
    // A secret in the client preset is unrecoverable once published.
    expect(() =>
      createEnv({
        client: z.object({ SECRET_KEY: z.string() }) as never,
        runtimeEnv: { SECRET_KEY: "x" } as never,
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

  it("later presets win on key collision", () => {
    const first = z.object({ FLAG: z.string() });
    const second = z.object({ FLAG: z.enum(["x", "y"]) });

    const env = createEnv({
      server: [first, second],
      runtimeEnv: { FLAG: "x" },
    });
    expect(env.FLAG).toBe("x");

    expect(() =>
      createEnv({
        server: [first, second],
        runtimeEnv: { FLAG: "z" },
      }),
    ).toThrow(/FLAG/);
  });

  it("rejects localhost URLs when APP_ENV is production", () => {
    expect(() =>
      createEnv({
        server: [base, db],
        runtimeEnv: {
          NODE_ENV: "production",
          APP_ENV: "production",
          APP_URL: "http://localhost:3000",
          LOG_LEVEL: undefined,
          DATABASE_URL: "postgres://localhost/app",
          DATABASE_POOL_SIZE: undefined,
        },
      }),
    ).toThrow(/localhost/);
  });

  it("rejects localhost URLs when APP_ENV is staging", () => {
    expect(() =>
      createEnv({
        server: [base, db],
        runtimeEnv: {
          NODE_ENV: "production",
          APP_ENV: "staging",
          APP_URL: "http://localhost:3000",
          LOG_LEVEL: undefined,
          DATABASE_URL: "postgres://localhost/app",
          DATABASE_POOL_SIZE: undefined,
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

  it("requires SMTP_URL or RESEND_API_KEY when both mail presets are composed", () => {
    expect(() =>
      createEnv({
        server: [resend, smtp],
        runtimeEnv: {
          EMAIL_FROM: "noreply@example.com",
          RESEND_API_KEY: undefined,
          SMTP_URL: undefined,
          MAILPIT_API_URL: undefined,
        },
      }),
    ).toThrow(/RESEND_API_KEY|SMTP_URL/);

    const viaSmtp = createEnv({
      server: [resend, smtp],
      runtimeEnv: {
        EMAIL_FROM: "noreply@example.com",
        RESEND_API_KEY: undefined,
        SMTP_URL: "smtp://127.0.0.1:55438",
        MAILPIT_API_URL: undefined,
      },
    });
    expect(viaSmtp.SMTP_URL).toBe("smtp://127.0.0.1:55438");
    expect(viaSmtp.RESEND_API_KEY).toBeUndefined();
  });

  it("requires RESEND_API_KEY when only the resend preset is composed", () => {
    expect(() =>
      createEnv({
        server: [resend],
        runtimeEnv: {
          EMAIL_FROM: "noreply@example.com",
          RESEND_API_KEY: undefined,
        },
      }),
    ).toThrow(/RESEND_API_KEY/);
  });

  it("requires SMTP_URL when only the smtp preset is composed", () => {
    expect(() =>
      createEnv({
        server: [smtp],
        runtimeEnv: {
          EMAIL_FROM: "noreply@example.com",
          SMTP_URL: undefined,
          MAILPIT_API_URL: undefined,
        },
      }),
    ).toThrow(/SMTP_URL/);
  });

  it("treats empty SMTP_URL as unset when Resend is configured", () => {
    const env = createEnv({
      server: [resend, smtp],
      runtimeEnv: {
        EMAIL_FROM: "noreply@example.com",
        RESEND_API_KEY: "re_abc",
        SMTP_URL: "",
        MAILPIT_API_URL: "",
      },
    });

    expect(env.SMTP_URL).toBeUndefined();
    expect(env.RESEND_API_KEY).toBe("re_abc");
  });

  it("pairs Stripe secret and webhook keys", () => {
    expect(() =>
      createEnv({
        server: [stripe],
        runtimeEnv: {
          STRIPE_SECRET_KEY: "sk_test_abc",
          STRIPE_WEBHOOK_SECRET: undefined,
        },
      }),
    ).toThrow(/STRIPE_WEBHOOK_SECRET/);

    expect(() =>
      createEnv({
        server: [stripe],
        runtimeEnv: {
          STRIPE_SECRET_KEY: undefined,
          STRIPE_WEBHOOK_SECRET: "whsec_abc",
        },
      }),
    ).toThrow(/STRIPE_SECRET_KEY/);
  });

  it("pairs Stripe secret and publishable key when both schemas are composed", () => {
    expect(() =>
      createEnv({
        server: [stripe],
        client: [stripeClient],
        runtimeEnv: {
          STRIPE_SECRET_KEY: "sk_test_abc",
          STRIPE_WEBHOOK_SECRET: "whsec_abc",
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: undefined,
        },
      }),
    ).toThrow(/NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY/);

    expect(() =>
      createEnv({
        server: [stripe],
        client: [stripeClient],
        runtimeEnv: {
          STRIPE_SECRET_KEY: undefined,
          STRIPE_WEBHOOK_SECRET: undefined,
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc",
        },
      }),
    ).toThrow(/STRIPE_SECRET_KEY/);
  });

  it("requires POSTHOG_HOST when POSTHOG_API_KEY is set", () => {
    expect(() =>
      createEnv({
        server: [posthog],
        runtimeEnv: {
          POSTHOG_API_KEY: "phc_abc",
          POSTHOG_HOST: undefined,
        },
      }),
    ).toThrow(/POSTHOG_HOST/);
  });

  it("requires NEXT_PUBLIC_POSTHOG_HOST when the browser key is set", () => {
    expect(() =>
      createEnv({
        client: [posthogClient],
        runtimeEnv: {
          NEXT_PUBLIC_POSTHOG_KEY: "phc_abc",
          NEXT_PUBLIC_POSTHOG_HOST: undefined,
        },
      }),
    ).toThrow(/NEXT_PUBLIC_POSTHOG_HOST/);
  });

  it("parses FLAGS_JSON into a boolean record", () => {
    const env = createEnv({
      server: [featureFlags],
      runtimeEnv: { FLAGS_JSON: '{"new-billing-portal":true}' },
    });

    expect(env.FLAGS_JSON).toEqual({ "new-billing-portal": true });
    expectTypeOf(env.FLAGS_JSON).toEqualTypeOf<Record<string, boolean> | undefined>();
  });

  it("rejects invalid FLAGS_JSON", () => {
    expect(() =>
      createEnv({
        server: [featureFlags],
        runtimeEnv: { FLAGS_JSON: "nope" },
      }),
    ).toThrow(/JSON/);

    expect(() =>
      createEnv({
        server: [featureFlags],
        runtimeEnv: { FLAGS_JSON: '{"new-billing-portal":"yes"}' },
      }),
    ).toThrow(/boolean/);
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
