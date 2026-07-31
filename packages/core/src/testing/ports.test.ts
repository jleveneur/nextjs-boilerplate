import { describe, expect, it } from "vitest";

import { createTestPorts } from "./create-test-ports.ts";
import { createFakeClock } from "./fake-clock.ts";
import { createInMemoryEventBus } from "./in-memory-event-bus.ts";
import { createInMemoryFileStore } from "./in-memory-file-store.ts";
import { createInMemoryJobQueue } from "./in-memory-job-queue.ts";
import { createInMemoryMailer } from "./in-memory-mailer.ts";
import { createSequenceIdGenerator, createUuidIdGenerator } from "./uuid-id-generator.ts";

describe("core test ports", () => {
  it("advances and sets a fake clock", () => {
    const clock = createFakeClock(new Date("2026-01-01T00:00:00.000Z"));
    clock.advanceMs(60_000);
    expect(clock.now().toISOString()).toBe("2026-01-01T00:01:00.000Z");
    clock.set(new Date("2026-06-01T00:00:00.000Z"));
    expect(clock.now().toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("delivers events to subscribers and supports unsubscribe/clear", async () => {
    const bus = createInMemoryEventBus();
    const seen: string[] = [];
    const unsubscribe = bus.subscribe("invoice.voided", (event) => {
      seen.push(event.type);
    });

    await bus.emit({
      type: "invoice.voided",
      payload: { invoiceId: "x" },
      occurredAt: new Date(),
    });
    expect(seen).toEqual(["invoice.voided"]);

    unsubscribe();
    await bus.emit({
      type: "invoice.voided",
      payload: { invoiceId: "y" },
      occurredAt: new Date(),
    });
    expect(seen).toHaveLength(1);

    bus.clear();
    expect(bus.emitted).toHaveLength(0);

    // Emit with no subscribers is a no-op.
    await bus.emit({
      type: "unused",
      payload: {},
      occurredAt: new Date(),
    });
  });

  it("enqueues and clears jobs in memory", async () => {
    const jobs = createInMemoryJobQueue();
    await jobs.enqueue("invoice.voided.notify", {
      invoiceId: "01900000-0000-7000-8000-000000000001",
      organizationId: "01900000-0000-7000-8000-000000000002",
      amountMinor: 100,
      idempotencyKey: "k1",
    });
    await jobs.enqueue(
      "email.send",
      {
        to: "a@example.com",
        subject: "Hi",
        organizationId: "01900000-0000-7000-8000-000000000002",
        idempotencyKey: "k2",
      },
      { jobId: "fixed-id" },
    );

    expect(jobs.jobs).toHaveLength(2);
    expect(jobs.jobs[1]?.opts?.jobId).toBe("fixed-id");
    jobs.clear();
    expect(jobs.jobs).toHaveLength(0);
    await jobs.close();
  });

  it("records and clears mailer sends", async () => {
    const mailer = createInMemoryMailer();
    await mailer.send({
      to: "a@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });
    expect(mailer.sent).toHaveLength(1);
    mailer.clear();
    expect(mailer.sent).toHaveLength(0);
  });

  it("presigns, gets, puts, heads, and deletes objects in the memory file store", async () => {
    const files = createInMemoryFileStore();
    const put = await files.createPresignedPut({
      key: "org/a/file",
      contentType: "text/plain",
    });
    expect(put.url).toContain("memory://put/");
    const get = await files.createPresignedGet({ key: "org/a/file" });
    expect(get.url).toContain("memory://get/");
    expect(files.keys.has("org/a/file")).toBe(true);
    await files.putObject({
      key: "org/a/file",
      body: new TextEncoder().encode("hi"),
      contentType: "text/plain",
    });
    await expect(files.getObject("org/a/file")).resolves.toEqual(new TextEncoder().encode("hi"));
    const head = await files.headObject("org/a/file");
    expect(head?.contentType).toBe("text/plain");
    expect(head?.contentLength).toBe(2);
    expect(await files.headObject("missing")).toBeUndefined();
    expect(await files.getObject("missing")).toBeUndefined();
    await files.deleteObject("org/a/file");
    expect(files.keys.has("org/a/file")).toBe(false);
  });

  it("generates sequence and uuid ids", () => {
    const seq = createSequenceIdGenerator();
    expect(seq.invoiceId()).toMatch(/^01900000-0000-7000-8000-/);
    expect(seq.assetId()).toMatch(/^01900000-0000-7000-8000-/);
    expect(seq.organizationId()).not.toBe(seq.userId());
    expect(seq.outboxId()).toBeTruthy();
    expect(seq.uuidV7()).toBeTruthy();

    const uuid = createUuidIdGenerator();
    expect(uuid.invoiceId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(uuid.assetId()).toBeTruthy();
    expect(uuid.organizationId()).toBeTruthy();
    expect(uuid.userId()).toBeTruthy();
    expect(uuid.outboxId()).toBeTruthy();
    expect(uuid.uuidV7()).toBeTruthy();
  });

  it("assembles a full test ports bundle", async () => {
    const ports = createTestPorts();
    await expect(ports.flags.isEnabled("x")).resolves.toBe(false);
    await expect(ports.analytics.capture("evt")).resolves.toBeUndefined();
    expect(ports.clock.now().toISOString()).toBe("2026-01-15T12:00:00.000Z");
  });
});
