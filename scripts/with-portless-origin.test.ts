/**
 * Tests for the Portless origin overlay used by app `dev` scripts.
 *
 * Run: node --test scripts/with-portless-origin.test.ts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyDefaultPort,
  applyPortlessOrigin,
  parsePortlessOriginArgs,
} from "./with-portless-origin.ts";

describe("parsePortlessOriginArgs", () => {
  it("takes the command and flags after an optional --", () => {
    assert.deepEqual(parsePortlessOriginArgs(["next", "dev"]), {
      defaultPort: undefined,
      command: "next",
      args: ["dev"],
    });
    assert.deepEqual(parsePortlessOriginArgs(["--default-port", "3003", "--", "next", "dev"]), {
      defaultPort: "3003",
      command: "next",
      args: ["dev"],
    });
  });

  it("rejects a missing command", () => {
    assert.throws(() => parsePortlessOriginArgs([]), /missing command/);
  });
});

describe("applyPortlessOrigin", () => {
  it("copies PORTLESS_URL onto the public origin vars", () => {
    const env: NodeJS.ProcessEnv = {
      PORTLESS_URL: "https://web.localhost",
      APP_URL: "http://localhost:3000",
    };
    applyPortlessOrigin(env);
    assert.equal(env["APP_URL"], "https://web.localhost");
    assert.equal(env["NEXT_PUBLIC_APP_URL"], "https://web.localhost");
    assert.equal(env["BETTER_AUTH_URL"], "https://web.localhost");
  });

  it("leaves origin vars alone when Portless is not wrapping the process", () => {
    const env: NodeJS.ProcessEnv = { APP_URL: "http://localhost:3000" };
    applyPortlessOrigin(env);
    assert.equal(env["APP_URL"], "http://localhost:3000");
    assert.equal(env["NEXT_PUBLIC_APP_URL"], undefined);
  });
});

describe("applyDefaultPort", () => {
  it("fills PORT only when unset", () => {
    const empty: NodeJS.ProcessEnv = {};
    applyDefaultPort(empty, "3003");
    assert.equal(empty["PORT"], "3003");

    const set: NodeJS.ProcessEnv = { PORT: "4312" };
    applyDefaultPort(set, "3003");
    assert.equal(set["PORT"], "4312");
  });
});
