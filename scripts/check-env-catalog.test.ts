/**
 * Tests for the env-example catalog checker.
 *
 * These files are the documented runtime contract. A silent drift between
 * `.env.example` and the staging/production placeholders, or a preset key
 * that never lands in the catalog, is incomplete work.
 *
 * Run: node --test scripts/check-env-catalog.test.ts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolve } from "node:path";

import {
  assignmentKeys,
  checkEnvCatalog,
  checkEnvCatalogFromRoot,
  parseAssignments,
  presetCatalogKeys,
} from "./check-env-catalog.ts";

const LOCAL = `NODE_ENV=development
APP_ENV=local
APP_URL=http://localhost:3000
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55432/app
# SMTP_URL=smtp://127.0.0.1:55438
`;

const STAGING = `NODE_ENV=production
APP_ENV=staging
APP_URL=https://staging.example.com
DATABASE_URL=postgres://USER:PASSWORD@db.example.com:5432/app_staging
# SMTP_URL=
`;

const PRODUCTION = `NODE_ENV=production
APP_ENV=production
APP_URL=https://app.example.com
DATABASE_URL=postgres://USER:PASSWORD@db.example.com:5432/app
# SMTP_URL=
`;

describe("parseAssignments", () => {
  it("reads set and commented keys in order", () => {
    const parsed = parseAssignments(LOCAL);
    assert.deepEqual(assignmentKeys(parsed), [
      "NODE_ENV",
      "APP_ENV",
      "APP_URL",
      "DATABASE_URL",
      "SMTP_URL",
    ]);
    assert.equal(parsed[4]?.commented, true);
  });

  it("ignores prose comments", () => {
    const parsed = parseAssignments("# Full catalog: docs/architecture/09.md\nAPP_ENV=local\n");
    assert.deepEqual(assignmentKeys(parsed), ["APP_ENV"]);
  });
});

describe("checkEnvCatalog", () => {
  it("accepts matching catalogs that cover the preset keys", () => {
    const keys = ["NODE_ENV", "APP_ENV", "APP_URL", "DATABASE_URL", "SMTP_URL"];
    const report = checkEnvCatalog(
      { example: LOCAL, staging: STAGING, production: PRODUCTION },
      keys,
    );
    assert.deepEqual(report.problems, []);
    assert.deepEqual(report.keys, keys);
  });

  it("rejects a key-order drift in staging", () => {
    const staging = `NODE_ENV=production
APP_ENV=staging
DATABASE_URL=postgres://USER:PASSWORD@db.example.com:5432/app_staging
APP_URL=https://staging.example.com
# SMTP_URL=
`;
    const report = checkEnvCatalog({ example: LOCAL, staging, production: PRODUCTION }, [
      "NODE_ENV",
      "APP_ENV",
      "APP_URL",
      "DATABASE_URL",
      "SMTP_URL",
    ]);
    assert.equal(report.problems.length, 1);
    assert.match(report.problems[0] ?? "", /staging\.example keys differ/);
  });

  it("rejects a preset key missing from the catalog", () => {
    const report = checkEnvCatalog({ example: LOCAL, staging: STAGING, production: PRODUCTION }, [
      "NODE_ENV",
      "APP_ENV",
      "REDIS_URL",
    ]);
    assert.equal(report.problems.length, 1);
    assert.match(report.problems[0] ?? "", /REDIS_URL: in @repo\/env presets/);
  });

  it("rejects production localhost values", () => {
    const production = `NODE_ENV=production
APP_ENV=production
APP_URL=http://localhost:3000
DATABASE_URL=postgres://USER:PASSWORD@db.example.com:5432/app
# SMTP_URL=
`;
    const report = checkEnvCatalog({ example: LOCAL, staging: STAGING, production }, [
      "NODE_ENV",
      "APP_ENV",
      "APP_URL",
      "DATABASE_URL",
      "SMTP_URL",
    ]);
    assert.equal(report.problems.length, 1);
    assert.match(report.problems[0] ?? "", /must not point at localhost/);
  });
});

describe("committed catalogs", () => {
  it("agree with each other and cover every preset key", async () => {
    const report = await checkEnvCatalogFromRoot(resolve(import.meta.dirname, ".."));
    assert.deepEqual(report.problems, [], report.problems.join("\n"));
    for (const key of presetCatalogKeys()) {
      assert.ok(report.keys.includes(key), `missing preset key ${key}`);
    }
  });
});
