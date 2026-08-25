import { Writable } from "node:stream";

import type * as CoreModule from "@repo/core";
import { resolveInvoiceVoidedRecipientEmail, type Ctx } from "@repo/core";
import { createNoopMailer } from "@repo/email";
import { TerminalJobError } from "@repo/jobs";
import { createLogger } from "@repo/logger";
import type { Actor } from "@repo/types";
import type { Redis } from "ioredis";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { beginJobIdempotency } from "../idempotency.ts";
import { createInvoiceVoidedNotifyHandler } from "./invoice-voided-notify.ts";

vi.mock("@repo/core", async (importOriginal) => {
  const actual = await importOriginal<typeof CoreModule>();
  return {
    ...actual,
    resolveInvoiceVoidedRecipientEmail: vi.fn(),
  };
});

vi.mock("../idempotency.ts", () => ({
  beginJobIdempotency: vi.fn(),
  completeJobIdempotency: vi.fn(() => Promise.resolve()),
  releaseJobIdempotency: vi.fn(() => Promise.resolve()),
}));

function makeCtx(actor: Actor): Ctx {
  return {
    actor,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- unused by mocked service
    db: {} as Ctx["db"],
    logger: createLogger({
      service: "invoice-voided-notify-test",
      env: "test",
      level: "error",
      destination: new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
    }),
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- unused by handler
    ports: {} as Ctx["ports"],
  };
}

function createHandler(mailer: ReturnType<typeof createNoopMailer>) {
  return createInvoiceVoidedNotifyHandler({
    buildCtx: makeCtx,
    mailer,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- idempotency call is mocked
    idempotencyRedis: {} as Redis,
  });
}

const payload = {
  invoiceId: "01900000-0000-7000-8000-000000000020",
  organizationId: "01900000-0000-7000-8000-000000000001",
  amountMinor: 1_00,
  idempotencyKey: "invoice-owner",
};

describe("createInvoiceVoidedNotifyHandler", () => {
  beforeEach(() => {
    vi.mocked(beginJobIdempotency).mockReset();
    vi.mocked(beginJobIdempotency).mockResolvedValue({ status: "claimed", token: "test-token" });
    vi.mocked(resolveInvoiceVoidedRecipientEmail).mockReset();
  });

  it("sends to the owner email resolved by core", async () => {
    vi.mocked(resolveInvoiceVoidedRecipientEmail).mockResolvedValue("owner@example.com");
    const mailer = createNoopMailer();

    await createHandler(mailer)(payload, { jobId: "1", attemptsMade: 0 });

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe("owner@example.com");
  });

  it("fails terminally when core cannot resolve an active owner", async () => {
    vi.mocked(resolveInvoiceVoidedRecipientEmail).mockResolvedValue(null);
    const mailer = createNoopMailer();

    await expect(
      createHandler(mailer)(payload, { jobId: "2", attemptsMade: 0 }),
    ).rejects.toBeInstanceOf(TerminalJobError);
    expect(mailer.sent).toHaveLength(0);
  });
});
