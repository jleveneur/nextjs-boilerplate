import { Writable } from "node:stream";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ORPCError } from "@orpc/server";
import { permissionsForOrganizationRole } from "@repo/auth";
import type { Asset, Invoice, RequestUploadOutput } from "@repo/contracts";
import * as core from "@repo/core";
import { createTestPorts } from "@repo/core/testing";
import { ForbiddenError, NotFoundError } from "@repo/errors";
import { createLogger } from "@repo/logger";
import type { Actor, AssetId, InvoiceId, OrganizationId, UserId } from "@repo/types";

import type { OrpcContext } from "./context.ts";
import { appRouter, createCallerFactory } from "./root.ts";

vi.mock("@repo/core", async (importOriginal) => {
  const actual = await importOriginal<typeof core>();
  return {
    ...actual,
    createInvoice: vi.fn(),
    getInvoice: vi.fn(),
    listInvoicesForOrg: vi.fn(),
    voidInvoice: vi.fn(),
    listBillingCatalog: vi.fn(),
    syncBillingCatalog: vi.fn(),
    getOrganizationSubscription: vi.fn(),
    startCheckout: vi.fn(),
    openBillingPortal: vi.fn(),
    requestUpload: vi.fn(),
    confirmUpload: vi.fn(),
  };
});

function brandUserId(id: string): UserId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as UserId;
}

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as OrganizationId;
}

function brandInvoiceId(id: string): InvoiceId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as InvoiceId;
}

function brandAssetId(id: string): AssetId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as AssetId;
}

function makeActor(role: "owner" | "member"): Actor {
  return {
    userId: brandUserId("01900000-0000-7000-8000-0000000000aa"),
    organizationId: brandOrganizationId("01900000-0000-7000-8000-000000000001"),
    role,
    permissions: permissionsForOrganizationRole(role),
    isSystem: false,
  };
}

function makeCtx(actor: Actor | null): OrpcContext {
  return {
    actor,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- services mocked
    db: {} as OrpcContext["db"],
    logger: createLogger({
      service: "orpc-test",
      env: "local",
      level: "error",
      destination: new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
    }),
    ports: createTestPorts(),
  };
}

const createCaller = createCallerFactory(appRouter);

const invoiceId = brandInvoiceId("01900000-0000-7000-8000-000000000010");

const sampleInvoice: Invoice = {
  id: invoiceId,
  organizationId: brandOrganizationId("01900000-0000-7000-8000-000000000001"),
  number: "INV-1",
  status: "open",
  amountMinor: 250,
  currency: "USD",
  createdAt: "2026-01-15T12:00:00.000Z",
  updatedAt: "2026-01-15T12:00:00.000Z",
};

describe("billing router via createCaller", () => {
  beforeEach(() => {
    vi.mocked(core.createInvoice).mockReset();
    vi.mocked(core.getInvoice).mockReset();
    vi.mocked(core.listInvoicesForOrg).mockReset();
    vi.mocked(core.voidInvoice).mockReset();
    vi.mocked(core.listBillingCatalog).mockReset();
    vi.mocked(core.syncBillingCatalog).mockReset();
    vi.mocked(core.getOrganizationSubscription).mockReset();
    vi.mocked(core.startCheckout).mockReset();
    vi.mocked(core.openBillingPortal).mockReset();
  });

  it("requires authentication for org procedures", async () => {
    const caller = createCaller(makeCtx(null));
    await expect(caller.billing.get({ invoiceId })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    } satisfies Partial<ORPCError<string, unknown>>);
  });

  it("creates an invoice on the happy path", async () => {
    vi.mocked(core.createInvoice).mockResolvedValue({ ...sampleInvoice, status: "draft" });
    const caller = createCaller(makeCtx(makeActor("owner")));

    const result = await caller.billing.create({
      number: "INV-1",
      amountMinor: 250,
      currency: "USD",
      status: "draft",
    });

    expect(result.status).toBe("draft");
    expect(core.createInvoice).toHaveBeenCalledOnce();
  });

  it("voids an invoice for an authorized actor", async () => {
    vi.mocked(core.voidInvoice).mockResolvedValue({ ...sampleInvoice, status: "void" });
    const caller = createCaller(makeCtx(makeActor("owner")));

    const result = await caller.billing.void({ invoiceId });
    expect(result.status).toBe("void");
  });

  it("maps ForbiddenError from void to FORBIDDEN with appCode", async () => {
    const forbidden = new ForbiddenError({ message: "Missing permission: invoice:void" });
    vi.mocked(core.voidInvoice).mockRejectedValue(forbidden);
    const caller = createCaller(makeCtx(makeActor("member")));

    await expect(caller.billing.void({ invoiceId })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Missing permission: invoice:void",
      cause: forbidden,
    });
  });

  it("maps NotFoundError to NOT_FOUND", async () => {
    vi.mocked(core.getInvoice).mockRejectedValue(
      new NotFoundError({ resource: "invoice", id: invoiceId }),
    );
    const caller = createCaller(makeCtx(makeActor("owner")));

    await expect(caller.billing.get({ invoiceId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("lists invoices", async () => {
    vi.mocked(core.listInvoicesForOrg).mockResolvedValue({
      data: [sampleInvoice],
      nextCursor: null,
    });
    const caller = createCaller(makeCtx(makeActor("member")));

    const result = await caller.billing.list({ limit: 20 });
    expect(result.data).toHaveLength(1);
  });

  it("reads catalog and subscription", async () => {
    vi.mocked(core.listBillingCatalog).mockResolvedValue([]);
    vi.mocked(core.getOrganizationSubscription).mockResolvedValue(null);
    const caller = createCaller(makeCtx(makeActor("member")));

    await expect(caller.billing.catalog()).resolves.toEqual([]);
    await expect(caller.billing.subscription()).resolves.toBeNull();
  });

  it("syncs catalog, starts checkout, and opens the portal", async () => {
    vi.mocked(core.syncBillingCatalog).mockResolvedValue({ count: 2 });
    vi.mocked(core.startCheckout).mockResolvedValue({ url: "https://checkout.test" });
    vi.mocked(core.openBillingPortal).mockResolvedValue({ url: "https://portal.test" });
    const caller = createCaller(makeCtx(makeActor("owner")));

    await expect(caller.billing.syncCatalog()).resolves.toEqual({ count: 2 });
    await expect(
      caller.billing.checkout({
        priceId: "price_1",
        successUrl: "https://app.test/ok",
        cancelUrl: "https://app.test/cancel",
      }),
    ).resolves.toEqual({ url: "https://checkout.test" });
    await expect(caller.billing.portal({ returnUrl: "https://app.test" })).resolves.toEqual({
      url: "https://portal.test",
    });
  });
});

describe("assets router via createCaller", () => {
  const assetId = brandAssetId("01900000-0000-7000-8000-000000000020");
  const sampleAsset: Asset = {
    id: assetId,
    organizationId: brandOrganizationId("01900000-0000-7000-8000-000000000001"),
    ownerUserId: brandUserId("01900000-0000-7000-8000-0000000000aa"),
    status: "pending",
    storageKey: "test/org/asset/id/photo.jpg",
    contentType: "image/jpeg",
    sizeBytes: 1024,
    originalFilename: "photo.jpg",
    createdAt: "2026-01-15T12:00:00.000Z",
    updatedAt: "2026-01-15T12:00:00.000Z",
  };

  beforeEach(() => {
    vi.mocked(core.requestUpload).mockReset();
    vi.mocked(core.confirmUpload).mockReset();
  });

  it("requests an upload", async () => {
    const output: RequestUploadOutput = {
      asset: sampleAsset,
      upload: {
        url: "https://example.com/put",
        key: sampleAsset.storageKey,
        expiresInSeconds: 300,
      },
    };
    vi.mocked(core.requestUpload).mockResolvedValue(output);
    const caller = createCaller(makeCtx(makeActor("member")));

    const result = await caller.assets.requestUpload({
      filename: "photo.jpg",
      contentType: "image/jpeg",
      sizeBytes: 1024,
    });

    expect(result.asset.id).toBe(assetId);
    expect(core.requestUpload).toHaveBeenCalledOnce();
  });

  it("confirms an upload", async () => {
    vi.mocked(core.confirmUpload).mockResolvedValue(sampleAsset);
    const caller = createCaller(makeCtx(makeActor("member")));

    const result = await caller.assets.confirmUpload({ assetId });
    expect(result.status).toBe("pending");
  });
});
