import { Writable } from "node:stream";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { permissionsForOrganizationRole } from "@repo/auth";
import type { Asset, Invoice, RequestUploadOutput } from "@repo/contracts";
import * as core from "@repo/core";
import { createTestPorts } from "@repo/core/testing";
import { ForbiddenError, NotFoundError } from "@repo/errors";
import { createLogger } from "@repo/logger";
import type { Actor, AssetId, InvoiceId, OrganizationId, UserId } from "@repo/types";
import type { TRPCError } from "@trpc/server";

import type { TrpcContext } from "./context.ts";
import { appRouter } from "./root.ts";
import { createCallerFactory } from "./trpc.ts";

vi.mock("@repo/core", async (importOriginal) => {
  const actual = await importOriginal<typeof core>();
  return {
    ...actual,
    createInvoice: vi.fn(),
    getInvoice: vi.fn(),
    listInvoicesForOrg: vi.fn(),
    voidInvoice: vi.fn(),
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

function makeCtx(actor: Actor | null): TrpcContext {
  return {
    actor,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- services mocked
    db: {} as TrpcContext["db"],
    logger: createLogger({
      service: "trpc-test",
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
  });

  it("requires authentication for org procedures", async () => {
    const caller = createCaller(makeCtx(null));
    await expect(caller.billing.get({ invoiceId })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    } satisfies Partial<TRPCError>);
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
