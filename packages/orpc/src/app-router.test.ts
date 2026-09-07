import { Writable } from "node:stream";

import type { ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as assets from "@repo/assets";
import * as billing from "@repo/billing";
import { InvoiceAlreadyPaidError, InvoiceAlreadyVoidError } from "@repo/billing";
import type { Asset, Invoice, RequestUploadOutput } from "@repo/contracts";
import { ForbiddenError, NotFoundError } from "@repo/errors";
import { createTestPorts } from "@repo/kernel/testing";
import { createLogger } from "@repo/logger";
import { permissionsForRole } from "@repo/permissions";
import * as subscription from "@repo/subscription";
import type { Actor, AssetId, InvoiceId, OrganizationId, UserId } from "@repo/types";

import type { OrpcContext } from "./context.ts";
import { appRouter, createCallerFactory } from "./root.ts";

// One mock per slice package now that the transport composes three of them.
vi.mock("@repo/billing", async (importOriginal) => {
  const actual = await importOriginal<typeof billing>();
  return {
    ...actual,
    createInvoice: vi.fn(),
    getInvoice: vi.fn(),
    listInvoicesForOrg: vi.fn(),
    voidInvoice: vi.fn(),
  };
});

vi.mock("@repo/subscription", async (importOriginal) => {
  const actual = await importOriginal<typeof subscription>();
  return {
    ...actual,
    listBillingCatalog: vi.fn(),
    syncBillingCatalog: vi.fn(),
    getOrganizationSubscription: vi.fn(),
    startCheckout: vi.fn(),
    openBillingPortal: vi.fn(),
  };
});

vi.mock("@repo/assets", async (importOriginal) => {
  const actual = await importOriginal<typeof assets>();
  return {
    ...actual,
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
    permissions: permissionsForRole(role),
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
    vi.mocked(billing.createInvoice).mockReset();
    vi.mocked(billing.getInvoice).mockReset();
    vi.mocked(billing.listInvoicesForOrg).mockReset();
    vi.mocked(billing.voidInvoice).mockReset();
    vi.mocked(subscription.listBillingCatalog).mockReset();
    vi.mocked(subscription.syncBillingCatalog).mockReset();
    vi.mocked(subscription.getOrganizationSubscription).mockReset();
    vi.mocked(subscription.startCheckout).mockReset();
    vi.mocked(subscription.openBillingPortal).mockReset();
  });

  it("requires authentication for org procedures", async () => {
    const caller = createCaller(makeCtx(null));
    await expect(caller.billing.get({ invoiceId })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    } satisfies Partial<ORPCError<string, unknown>>);
  });

  it("creates an invoice on the happy path", async () => {
    vi.mocked(billing.createInvoice).mockResolvedValue({ ...sampleInvoice, status: "draft" });
    const caller = createCaller(makeCtx(makeActor("owner")));

    const result = await caller.billing.create({
      number: "INV-1",
      amountMinor: 250,
      currency: "USD",
      status: "draft",
    });

    expect(result.status).toBe("draft");
    expect(billing.createInvoice).toHaveBeenCalledOnce();
  });

  it("voids an invoice for an authorized actor", async () => {
    vi.mocked(billing.voidInvoice).mockResolvedValue({ ...sampleInvoice, status: "void" });
    const caller = createCaller(makeCtx(makeActor("owner")));

    const result = await caller.billing.void({ invoiceId });
    expect(result.status).toBe("void");
  });

  it("maps ForbiddenError from void to FORBIDDEN with appCode", async () => {
    const forbidden = new ForbiddenError({ message: "Missing permission: invoice:void" });
    vi.mocked(billing.voidInvoice).mockRejectedValue(forbidden);
    const caller = createCaller(makeCtx(makeActor("member")));

    await expect(caller.billing.void({ invoiceId })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Missing permission: invoice:void",
      cause: forbidden,
    });
  });

  it("maps NotFoundError to NOT_FOUND", async () => {
    vi.mocked(billing.getInvoice).mockRejectedValue(
      new NotFoundError({ resource: "invoice", id: invoiceId }),
    );
    const caller = createCaller(makeCtx(makeActor("owner")));

    await expect(caller.billing.get({ invoiceId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("lists invoices", async () => {
    vi.mocked(billing.listInvoicesForOrg).mockResolvedValue({
      data: [sampleInvoice],
      nextCursor: null,
    });
    const caller = createCaller(makeCtx(makeActor("member")));

    const result = await caller.billing.list({ limit: 20 });
    expect(result.data).toHaveLength(1);
  });

  it("reads catalog and subscription", async () => {
    vi.mocked(subscription.listBillingCatalog).mockResolvedValue([]);
    vi.mocked(subscription.getOrganizationSubscription).mockResolvedValue(null);
    const caller = createCaller(makeCtx(makeActor("member")));

    await expect(caller.billing.catalog()).resolves.toEqual([]);
    await expect(caller.billing.subscription()).resolves.toBeNull();
  });

  it("syncs catalog, starts checkout, and opens the portal", async () => {
    vi.mocked(subscription.syncBillingCatalog).mockResolvedValue({ count: 2 });
    vi.mocked(subscription.startCheckout).mockResolvedValue({ url: "https://checkout.test" });
    vi.mocked(subscription.openBillingPortal).mockResolvedValue({ url: "https://portal.test" });
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
    vi.mocked(assets.requestUpload).mockReset();
    vi.mocked(assets.confirmUpload).mockReset();
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
    vi.mocked(assets.requestUpload).mockResolvedValue(output);
    const caller = createCaller(makeCtx(makeActor("member")));

    const result = await caller.assets.requestUpload({
      filename: "photo.jpg",
      contentType: "image/jpeg",
      sizeBytes: 1024,
    });

    expect(result.asset.id).toBe(assetId);
    expect(assets.requestUpload).toHaveBeenCalledOnce();
  });

  it("confirms an upload", async () => {
    vi.mocked(assets.confirmUpload).mockResolvedValue(sampleAsset);
    const caller = createCaller(makeCtx(makeActor("member")));

    const result = await caller.assets.confirmUpload({ assetId });
    expect(result.status).toBe("pending");
  });
});

/**
 * A Server Component calling a service in-process never touches the `/api/rpc`
 * route, so without this hook its failures reach Next's `error.tsx` and nothing
 * else — the one class of production error with no log line and no tracker event.
 */
describe("createCallerFactory failure reporting", () => {
  it("reports a failure and still rethrows it", async () => {
    const reported: Array<{ error: unknown; path: ReadonlyArray<string | number> }> = [];
    const caller = createCallerFactory(appRouter, (error, path) => {
      reported.push({ error, path });
    })(makeCtx(null));

    // No actor: `orgProcedure` rejects before reaching any service.
    await expect(caller.billing.list({ limit: 20 })).rejects.toThrow();

    expect(reported).toHaveLength(1);
    expect(reported[0]?.path).toEqual(["billing", "list"]);
  });

  it("stays silent on success", async () => {
    const reported: unknown[] = [];
    const caller = createCallerFactory(appRouter, (error) => {
      reported.push(error);
    })(makeCtx(null));

    await expect(caller.billing.list({ limit: 20 })).rejects.toThrow();
    expect(reported).toHaveLength(1);
  });

  it("works without a reporter, as tests and other callers use it", async () => {
    const caller = createCallerFactory(appRouter)(makeCtx(null));

    await expect(caller.billing.list({ limit: 20 })).rejects.toThrow();
  });
});

/**
 * The typed error contract on `billing.void`.
 *
 * Declaring it is only worth anything if a refusal raised deep in the domain
 * still arrives in that shape: the service throws `InvoiceAlreadyPaidError`, and
 * the caller must receive a CONFLICT carrying the domain code it can branch on.
 */
describe("billing.void typed errors", () => {
  it.each([
    ["INVOICE_ALREADY_PAID", new InvoiceAlreadyPaidError("inv_1")],
    ["INVOICE_ALREADY_VOID", new InvoiceAlreadyVoidError("inv_1")],
  ] as const)("surfaces %s as CONFLICT with the declared appCode", async (appCode, thrown) => {
    vi.mocked(billing.voidInvoice).mockRejectedValue(thrown);
    const caller = createCaller(makeCtx(makeActor("owner")));

    await expect(caller.billing.void({ invoiceId })).rejects.toMatchObject({
      // CONFLICT, not a custom code: a custom one is absent from
      // COMMON_ERROR_STATUS_MAP and the response would arrive as a 500.
      code: "CONFLICT",
      data: { appCode },
    });
  });
});
