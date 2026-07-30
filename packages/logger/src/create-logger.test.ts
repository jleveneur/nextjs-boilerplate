import { Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import { getLogger, runWithLogger } from "./context.ts";
import { createLogger } from "./create-logger.ts";

function collectLines(): {
  stream: Writable;
  lines: () => Array<Record<string, unknown>>;
} {
  const chunks: Uint8Array[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk instanceof Uint8Array ? chunk : Buffer.from(String(chunk)));
      callback();
    },
  });

  return {
    stream,
    lines() {
      const text = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
      return text
        .split("\n")
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as Record<string, unknown>);
    },
  };
}

describe("createLogger", () => {
  it("emits structured JSON with service and env", () => {
    const { stream, lines } = collectLines();
    const log = createLogger({
      service: "api",
      env: "local",
      version: "abc123",
      level: "info",
      destination: stream,
    });

    log.info({ invoiceId: "inv_1" }, "invoice voided");

    const [entry] = lines();
    expect(entry).toMatchObject({
      service: "api",
      env: "local",
      version: "abc123",
      invoiceId: "inv_1",
      msg: "invoice voided",
    });
  });

  it("redacts secret fields", () => {
    const { stream, lines } = collectLines();
    const log = createLogger({
      service: "api",
      env: "local",
      level: "info",
      destination: stream,
    });

    log.info(
      {
        password: "hunter2",
        token: "tok_secret",
        nested: { apiKey: "key_secret" },
        safe: "ok",
      },
      "auth attempt",
    );

    const [entry] = lines();
    expect(entry).toBeDefined();
    if (entry === undefined) {
      throw new Error("expected a log line");
    }

    expect(entry["password"]).toBe("[Redacted]");
    expect(entry["token"]).toBe("[Redacted]");
    const nested = entry["nested"];
    expect(nested).toEqual({ apiKey: "[Redacted]" });
    expect(entry["safe"]).toBe("ok");
  });

  it("mixes in trace context from the injected callback", () => {
    const { stream, lines } = collectLines();
    const log = createLogger({
      service: "api",
      env: "local",
      level: "info",
      destination: stream,
      getTraceContext: () => ({ traceId: "t1", spanId: "s1" }),
    });

    log.info("traced");

    const [entry] = lines();
    expect(entry).toMatchObject({ traceId: "t1", spanId: "s1" });
  });
});

describe("runWithLogger / getLogger", () => {
  it("exposes the logger only inside the async scope", () => {
    const { stream } = collectLines();
    const log = createLogger({
      service: "api",
      env: "local",
      destination: stream,
    });

    expect(getLogger()).toBeUndefined();

    runWithLogger(log, () => {
      expect(getLogger()).toBe(log);
    });

    expect(getLogger()).toBeUndefined();
  });

  it("isolates concurrent scopes", async () => {
    const a = createLogger({
      service: "a",
      env: "local",
      destination: collectLines().stream,
    });
    const b = createLogger({
      service: "b",
      env: "local",
      destination: collectLines().stream,
    });

    const seen: Array<string | undefined> = [];

    await Promise.all([
      runWithLogger(a, async () => {
        await Promise.resolve();
        const service = getLogger()?.bindings()["service"];
        seen.push(typeof service === "string" ? service : undefined);
      }),
      runWithLogger(b, async () => {
        await Promise.resolve();
        const service = getLogger()?.bindings()["service"];
        seen.push(typeof service === "string" ? service : undefined);
      }),
    ]);

    expect(seen).toEqual(expect.arrayContaining(["a", "b"]));
    expect(seen).toHaveLength(2);
  });
});
