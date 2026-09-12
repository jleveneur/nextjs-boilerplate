import { pino } from "pino";
import { describe, expect, it } from "vitest";

/**
 * Redaction is the part of the logger worth testing.
 *
 * The level and the format are configuration; whether a cookie reaches stdout
 * is a security property, and it is easy to break by adding a field. This
 * mirrors the production configuration against an in-memory stream.
 */
function capture(value: unknown): Record<string, unknown> {
  const lines: string[] = [];

  const log = pino(
    {
      redact: {
        paths: [
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
        ],
        censor: "[redacted]",
      },
    },
    {
      write(line: string) {
        lines.push(line);
      },
    },
  );

  log.info(value, "test");

  return JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
}

describe("redaction", () => {
  it("scrubs credentials at the top level", () => {
    const line = capture({ password: "hunter2", token: "abc", secret: "shh" });

    expect(line["password"]).toBe("[redacted]");
    expect(line["token"]).toBe("[redacted]");
    expect(line["secret"]).toBe("[redacted]");
  });

  it("scrubs a cookie nested one level down, which is how it usually arrives", () => {
    const line = capture({ headers: { cookie: "better-auth.session_token=abc" } });

    expect(line["headers"]).toStrictEqual({ cookie: "[redacted]" });
  });

  it("scrubs an authorization header off an arbitrary object", () => {
    const line = capture({ request: { authorization: "Bearer sk_live_123" } });

    expect(line["request"]).toStrictEqual({ authorization: "[redacted]" });
  });

  it("leaves everything else alone", () => {
    const line = capture({ path: "post.create", userId: "user_123" });

    expect(line["path"]).toBe("post.create");
    expect(line["userId"]).toBe("user_123");
  });
});
