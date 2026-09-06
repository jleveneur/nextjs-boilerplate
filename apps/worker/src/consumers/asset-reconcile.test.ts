import { Writable } from "node:stream";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as CoreModule from "@repo/core";
import { reconcileOrphanAssets, type Ctx } from "@repo/core";
import { createLogger } from "@repo/logger";
import type { Actor } from "@repo/types";

import { createAssetReconcileHandler } from "./asset-reconcile.ts";

vi.mock("@repo/core", async (importOriginal) => {
  const actual = await importOriginal<typeof CoreModule>();
  return {
    ...actual,
    reconcileOrphanAssets: vi.fn(),
  };
});

function makeCtx(actor: Actor): Ctx {
  return {
    actor,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- unused by mocked service
    db: {} as Ctx["db"],
    logger: createLogger({
      service: "asset-reconcile-test",
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

describe("createAssetReconcileHandler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-02T00:00:00.000Z"));
    vi.mocked(reconcileOrphanAssets).mockReset();
    vi.mocked(reconcileOrphanAssets).mockResolvedValue({ failed: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to assets older than a day", async () => {
    await createAssetReconcileHandler({ buildCtx: makeCtx })({}, { jobId: "1", attemptsMade: 0 });

    expect(reconcileOrphanAssets).toHaveBeenCalledWith(
      expect.anything(),
      new Date("2026-03-01T00:00:00.000Z"),
    );
  });

  it("honours an explicit cutoff", async () => {
    await createAssetReconcileHandler({ buildCtx: makeCtx })(
      { olderThanIso: "2026-02-01T12:00:00.000Z" },
      { jobId: "2", attemptsMade: 0 },
    );

    expect(reconcileOrphanAssets).toHaveBeenCalledWith(
      expect.anything(),
      new Date("2026-02-01T12:00:00.000Z"),
    );
  });

  it("runs as the system actor", async () => {
    const buildCtx = vi.fn(makeCtx);

    await createAssetReconcileHandler({ buildCtx })({}, { jobId: "3", attemptsMade: 0 });

    // A cross-tenant sweep cannot borrow a tenant's actor.
    expect(buildCtx.mock.calls[0]?.[0]).toMatchObject({
      organizationId: "01900000-0000-7000-8000-000000000000",
    });
  });
});
