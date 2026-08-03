import { Writable } from "node:stream";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as DbModule from "@repo/db";
import { permissionsForRole } from "@repo/authz";
import { ForbiddenError, NotFoundError } from "@repo/errors";
import { createLogger } from "@repo/logger";
import type { Actor, InvoiceId, OrganizationId, UserId } from "@repo/types";
import { encodeCursor } from "@repo/utils";

import type { Ctx } from "../ctx.ts";
import { createTestPorts, type TestPorts } from "../testing/create-test-ports.ts";
import * as audit from "../write-audit-log.ts";
import { InvoiceAlreadyPaidError, InvoiceAlreadyVoidError } from "./billing.errors.ts";
import * as repository from "./billing.repository.ts";
import { createInvoice, getInvoice, listInvoicesForOrg, voidInvoice } from "./billing.service.ts";
import { subscribeInvoiceVoidedNotify } from "./subscribe-invoice-voided.ts";

vi.mock("./billing.repository.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof repository>();
  return {
    ...actual,
    findInvoiceById: vi.fn(),
    updateInvoiceStatus: vi.fn(),
    insertInvoice: vi.fn(),
    listInvoices: vi.fn(),
  };
});

vi.mock("../outbox/write-outbox-event.ts", () => ({
  writeOutboxEvent: vi.fn((input: { id: string }) =>
    Promise.resolve({
      id: input.id,
      eventType: "invoice.voided",
    }),
  ),
}));

vi.mock("../write-audit-log.ts", () => ({
  writeAuditLog: vi.fn(() => Promise.resolve()),
}));

vi.mock("@repo/db", async (importOriginal) => {
  const actual = await importOriginal<typeof DbModule>();
  return {
    ...actual,
    withTransaction: <T>(_db: unknown, fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}),
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

function makeActor(role: "owner" | "member"): Actor {
  return {
    userId: brandUserId("01900000-0000-7000-8000-0000000000aa"),
    organizationId: brandOrganizationId("01900000-0000-7000-8000-000000000001"),
    role,
    permissions: permissionsForRole(role),
    isSystem: false,
  };
}

type TestCtx = Omit<Ctx, "ports"> & { ports: TestPorts };

function makeCtx(actor: Actor): TestCtx {
  const ports = createTestPorts();
  subscribeInvoiceVoidedNotify(ports.events, ports.jobs);
  return {
    actor,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- unused under withTransaction mock
    db: {} as Ctx["db"],
    logger: createLogger({
      service: "core-test",
      env: "local",
      level: "error",
      destination: new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
    }),
    ports,
  };
}

const orgId = "01900000-0000-7000-8000-000000000001";
const invoiceId = brandInvoiceId("01900000-0000-7000-8000-000000000010");
const now = new Date("2026-01-15T12:00:00.000Z");

function openRow(overrides: Partial<repository.InvoiceRow> = {}): repository.InvoiceRow {
  return {
    id: invoiceId,
    organizationId: orgId,
    number: "INV-1",
    status: "open",
    amountMinor: 250,
    currency: "USD",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

describe("createInvoice", () => {
  beforeEach(() => {
    vi.mocked(repository.insertInvoice).mockReset();
  });

  it("inserts and returns a DTO", async () => {
    vi.mocked(repository.insertInvoice).mockResolvedValue(
      openRow({ status: "draft", number: "INV-9", amountMinor: 100 }),
    );

    const result = await createInvoice(makeCtx(makeActor("owner")), {
      number: "INV-9",
      amountMinor: 100,
      currency: "USD",
      status: "draft",
    });

    expect(result.number).toBe("INV-9");
    expect(result.status).toBe("draft");
  });
});

describe("getInvoice", () => {
  beforeEach(() => {
    vi.mocked(repository.findInvoiceById).mockReset();
  });

  it("returns the invoice when found", async () => {
    vi.mocked(repository.findInvoiceById).mockResolvedValue(openRow());
    const result = await getInvoice(makeCtx(makeActor("member")), { invoiceId });
    expect(result.id).toBe(invoiceId);
  });

  it("throws NotFoundError when missing", async () => {
    vi.mocked(repository.findInvoiceById).mockResolvedValue(null);
    await expect(getInvoice(makeCtx(makeActor("owner")), { invoiceId })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("listInvoicesForOrg", () => {
  beforeEach(() => {
    vi.mocked(repository.listInvoices).mockReset();
  });

  it("returns a page and nextCursor when more rows exist", async () => {
    const rows = [
      openRow({ id: "01900000-0000-7000-8000-000000000011" }),
      openRow({ id: "01900000-0000-7000-8000-000000000010" }),
    ];
    vi.mocked(repository.listInvoices).mockResolvedValue(rows);

    const result = await listInvoicesForOrg(makeCtx(makeActor("member")), { limit: 1 });
    expect(result.data).toHaveLength(1);
    expect(result.nextCursor).not.toBeNull();
  });

  it("rejects an invalid cursor", async () => {
    await expect(
      listInvoicesForOrg(makeCtx(makeActor("member")), {
        limit: 10,
        cursor: "not-a-cursor",
      }),
    ).rejects.toThrow("Invalid pagination cursor");
  });

  it("decodes a valid cursor", async () => {
    vi.mocked(repository.listInvoices).mockResolvedValue([]);
    const cursor = encodeCursor({
      createdAt: now.toISOString(),
      id: invoiceId,
    });

    await listInvoicesForOrg(makeCtx(makeActor("member")), { limit: 10, cursor });
    expect(repository.listInvoices).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        limit: 10,
        cursor: { createdAt: now, id: invoiceId },
      }),
    );
  });
});

describe("voidInvoice", () => {
  beforeEach(() => {
    vi.mocked(repository.findInvoiceById).mockReset();
    vi.mocked(repository.updateInvoiceStatus).mockReset();
    vi.mocked(audit.writeAuditLog).mockReset();
  });

  it("voids and audits an open invoice, then emits and enqueues notify", async () => {
    const row = openRow();
    vi.mocked(repository.findInvoiceById).mockResolvedValue(row);
    vi.mocked(repository.updateInvoiceStatus).mockResolvedValue({ ...row, status: "void" });

    const ctx = makeCtx(makeActor("owner"));
    const result = await voidInvoice(ctx, { invoiceId });

    expect(result.status).toBe("void");
    expect(ctx.ports.events.emitted).toHaveLength(1);
    expect(ctx.ports.jobs.jobs).toHaveLength(1);
    expect(ctx.ports.jobs.jobs[0]?.name).toBe("invoice.voided.notify");
    expect(audit.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actor: ctx.actor, tx: expect.anything() }),
      {
        action: "invoice.voided",
        resourceType: "invoice",
        resourceId: invoiceId,
        metadata: {
          previous_status: "open",
          status: "void",
        },
      },
    );
    expect(vi.mocked(audit.writeAuditLog).mock.calls[0]?.[0].tx).toBe(
      vi.mocked(repository.updateInvoiceStatus).mock.calls[0]?.[0].db,
    );
  });

  it("refuses a paid invoice", async () => {
    vi.mocked(repository.findInvoiceById).mockResolvedValue(openRow({ status: "paid" }));

    await expect(voidInvoice(makeCtx(makeActor("owner")), { invoiceId })).rejects.toBeInstanceOf(
      InvoiceAlreadyPaidError,
    );
  });

  it("refuses an already void invoice", async () => {
    vi.mocked(repository.findInvoiceById).mockResolvedValue(openRow({ status: "void" }));

    await expect(voidInvoice(makeCtx(makeActor("owner")), { invoiceId })).rejects.toBeInstanceOf(
      InvoiceAlreadyVoidError,
    );
  });

  it("forbids a member without invoice:void", async () => {
    vi.mocked(repository.findInvoiceById).mockResolvedValue(openRow());

    await expect(voidInvoice(makeCtx(makeActor("member")), { invoiceId })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("returns not found when the invoice is missing", async () => {
    vi.mocked(repository.findInvoiceById).mockResolvedValue(null);

    await expect(voidInvoice(makeCtx(makeActor("owner")), { invoiceId })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
