/**
 * Phase 10 proofs: upload→derivatives E2E, idempotent retry, SIGTERM drain,
 * Redis noeviction.
 */

import { Writable } from "node:stream";

import { permissionsForRole } from "@repo/authz";
import { confirmUpload, relayOutboxBatch, requestUpload, type Ctx } from "@repo/core";
import { createUuidIdGenerator } from "@repo/core/testing";
import { createDb, findAssetById, type Database } from "@repo/db";
import { asset, outbox } from "@repo/db/schema";
import { createFactories, setupDbIntegrationTests } from "@repo/db/testing";
import { createNoopMailer } from "@repo/email";
import {
  createBullMqJobQueue,
  createBullMqWorker,
  type BullMqJobQueue,
  type BullMqWorker,
} from "@repo/jobs";
import { createLogger } from "@repo/logger";
import { createNoopPaymentGateway } from "@repo/payments";
import { createFileStore, derivativeObjectKey, type FileStore } from "@repo/storage";
import type { Actor, OrganizationId, UserId } from "@repo/types";

import { eq } from "drizzle-orm";
import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createEmailSendHandler } from "./consumers/email-send.ts";
import { createImageDeriveHandler } from "./consumers/image-derive.ts";
import { beginJobIdempotency } from "./idempotency.ts";
import { assertRedisNoEviction } from "./redis-policy.ts";

const PNG_1X1 = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is required for worker integration tests`);
  }
  return value;
}

function brandUserId(id: string): UserId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as UserId;
}

function makeActor(userId: UserId, organizationId: OrganizationId): Actor {
  return {
    userId,
    organizationId,
    role: "owner",
    permissions: permissionsForRole("owner"),
    isSystem: false,
  };
}

function makeCtx(actor: Actor, db: Database, files: FileStore): Ctx {
  const events = {
    emit: () => Promise.resolve(),
    subscribe: () => () => undefined,
  };
  return {
    actor,
    db,
    logger: createLogger({
      service: "worker-it",
      env: "test",
      level: "error",
      destination: new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
    }),
    ports: {
      appEnv: "test",
      clock: { now: () => new Date() },
      ids: createUuidIdGenerator(),
      events,
      jobs: {
        enqueue: () => Promise.reject(new Error("jobs unused in this ctx")),
        close: () => Promise.resolve(),
      },
      mailer: {
        send: () => Promise.resolve({ id: "noop" }),
      },
      files,
      flags: { isEnabled: () => Promise.resolve(false) },
      analytics: { capture: () => Promise.resolve() },
      payments: createNoopPaymentGateway(),
    },
  };
}

describe("phase 10 worker proofs", () => {
  const { db, withTestTransaction } = setupDbIntegrationTests();
  const redisUrl = requireEnv("REDIS_URL");
  const prefix = `{worker-p10-${String(Date.now())}}`;
  const queueName = "worker-phase10";

  let files: FileStore;
  let queue: BullMqJobQueue;
  let worker: BullMqWorker;
  let idempotencyRedis: Redis;
  let sqlEnd: () => Promise<void>;

  beforeAll(async () => {
    await assertRedisNoEviction(redisUrl);

    files = createFileStore({
      endpoint: requireEnv("S3_ENDPOINT"),
      region: process.env["S3_REGION"] ?? "auto",
      bucket: requireEnv("S3_BUCKET"),
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
      forcePathStyle: true,
    });

    const { client } = createDb({ connectionString: requireEnv("DATABASE_URL"), max: 2 });
    sqlEnd = async () => {
      await client.end({ timeout: 5 });
    };

    idempotencyRedis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
    queue = createBullMqJobQueue({ redisUrl, queueName, prefix });

    const buildCtx = (actor: Actor): Ctx => makeCtx(actor, db, files);
    const mailer = createNoopMailer();

    worker = createBullMqWorker({
      redisUrl,
      queueName,
      prefix,
      handlers: {
        "email.send": createEmailSendHandler({
          buildCtx,
          mailer,
          idempotencyRedis,
        }),
        "invoice.voided.notify": () => Promise.resolve(),
        "image.derive": createImageDeriveHandler({ buildCtx, files, idempotencyRedis }),
        "asset.reconcile-orphans": () => Promise.resolve(),
        "stripe.event.process": () => Promise.resolve(),
      },
    });
    await worker.waitUntilReady();
  }, 60_000);

  afterAll(async () => {
    await worker.close();
    await queue.close();
    await idempotencyRedis.quit();
    await sqlEnd();
  });

  it("asserts redis noeviction", async () => {
    await expect(assertRedisNoEviction(redisUrl)).resolves.toBeUndefined();
  });

  it("runs upload → confirm → relay → image.derive end to end", async () => {
    const factories = createFactories(db);
    const owner = await factories.makeUser();
    const org = await factories.makeOrganization({
      slug: `p10-${String(Date.now())}`,
    });
    await factories.makeMember({
      organizationId: org.id,
      userId: owner.id,
      role: "owner",
    });

    const actor = makeActor(brandUserId(owner.id), org.id);
    const ctx = makeCtx(actor, db, files);

    const requested = await requestUpload(ctx, {
      filename: "pixel.png",
      contentType: "image/png",
      sizeBytes: PNG_1X1.byteLength,
    });

    const put = await fetch(requested.upload.url, {
      method: "PUT",
      headers: { "Content-Type": "image/png" },
      body: PNG_1X1,
    });
    expect(put.ok).toBe(true);

    await confirmUpload(ctx, { assetId: requested.asset.id });

    const relayJobs = createBullMqJobQueue({ redisUrl, queueName, prefix });
    try {
      const relayed = await relayOutboxBatch({ db, jobs: relayJobs, limit: 20 });
      expect(relayed.published + relayed.skipped).toBeGreaterThan(0);
    } finally {
      await relayJobs.close();
    }

    await expect
      .poll(
        async () => {
          const row = await findAssetById({ organizationId: org.id, db }, requested.asset.id);
          return row?.status === "ready";
        },
        { timeout: 30_000, interval: 200 },
      )
      .toBeTruthy();

    const webp = await files.headObject(derivativeObjectKey(requested.asset.storageKey, "webp"));
    const avif = await files.headObject(derivativeObjectKey(requested.asset.storageKey, "avif"));
    expect(webp?.contentType).toBe("image/webp");
    expect(avif?.contentType).toBe("image/avif");

    await files.deleteObject(requested.asset.storageKey);
    await files.deleteObject(derivativeObjectKey(requested.asset.storageKey, "webp"));
    await files.deleteObject(derivativeObjectKey(requested.asset.storageKey, "avif"));
    await db.delete(outbox).where(eq(outbox.organizationId, org.id));
    await db.delete(asset).where(eq(asset.id, requested.asset.id));
  }, 60_000);

  it("treats a second email.send with the same idempotency key as a no-op", async () => {
    const mailer = createNoopMailer();
    const handler = createEmailSendHandler({
      buildCtx: (actor) => makeCtx(actor, db, files),
      mailer,
      idempotencyRedis,
    });

    const key = `email-idem-${String(Date.now())}`;
    const payload = {
      to: "idem@example.com",
      subject: "Once",
      organizationId: "01900000-0000-7000-8000-000000000001",
      idempotencyKey: key,
    };

    await handler(payload, { jobId: "1", attemptsMade: 0 });
    await handler(payload, { jobId: "2", attemptsMade: 1 });

    expect(mailer.sent).toHaveLength(1);
    await expect(beginJobIdempotency(idempotencyRedis, key)).resolves.toEqual({
      status: "completed",
    });
  });

  it("drains an in-flight job on worker.close before resolving", async () => {
    let started = false;
    let finished = false;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const drainQueue = `worker-drain-${String(Date.now())}`;
    const drainPrefix = `{drain-${String(Date.now())}}`;
    const drainJobs = createBullMqJobQueue({
      redisUrl,
      queueName: drainQueue,
      prefix: drainPrefix,
    });
    const drainWorker = createBullMqWorker({
      redisUrl,
      queueName: drainQueue,
      prefix: drainPrefix,
      handlers: {
        "email.send": async () => {
          started = true;
          await gate;
          finished = true;
        },
        "invoice.voided.notify": () => Promise.resolve(),
        "image.derive": () => Promise.resolve(),
        "asset.reconcile-orphans": () => Promise.resolve(),
        "stripe.event.process": () => Promise.resolve(),
      },
    });
    await drainWorker.waitUntilReady();

    await drainJobs.enqueue("email.send", {
      to: "drain@example.com",
      subject: "Drain",
      organizationId: "01900000-0000-7000-8000-000000000001",
      idempotencyKey: `drain-${String(Date.now())}`,
    });

    await expect.poll(() => started, { timeout: 10_000, interval: 50 }).toBeTruthy();

    const closing = drainWorker.close();
    // Give close a moment to begin draining, then release the handler.
    await new Promise((r) => setTimeout(r, 50));
    expect(finished).toBe(false);
    release();
    await closing;
    expect(finished).toBe(true);

    await drainJobs.close();
  });

  it("keeps withTestTransaction isolation for unrelated db helpers", async () => {
    await withTestTransaction(async ({ factories }) => {
      const user = await factories.makeUser();
      expect(user.id).toBeTruthy();
    });
  });
});
