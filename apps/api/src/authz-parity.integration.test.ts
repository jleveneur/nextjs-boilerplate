/**
 * ADR-0003 proof: the same Actor + core service yields identical authorization
 * outcomes over tRPC and REST.
 */

import { describe, expect, it } from "vitest";

import { permissionsForOrganizationRole } from "@repo/auth";
import { createTestPorts } from "@repo/core/testing";
import { setupDbIntegrationTests } from "@repo/db/testing";
import { ERROR_CODES, isAppError } from "@repo/errors";
import { createLogger } from "@repo/logger";
import { appRouter, createCallerFactory, type TrpcContext } from "@repo/trpc";
import type { Actor, InvoiceId, OrganizationId, UserId } from "@repo/types";
import { Writable } from "node:stream";

import { createParityApp, type ParityDb } from "./testing/parity-app.ts";

const { withTestTransaction } = setupDbIntegrationTests();

function brandInvoiceId(id: string): InvoiceId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as InvoiceId;
}

function makeActor(
  role: "owner" | "member",
  organizationId: OrganizationId,
  userId: UserId,
): Actor {
  return {
    userId,
    organizationId,
    role,
    permissions: permissionsForOrganizationRole(role),
    isSystem: false,
  };
}

function makeTrpcCtx(
  actor: Actor,
  db: TrpcContext["db"],
  ports: TrpcContext["ports"],
): TrpcContext {
  return {
    actor,
    db,
    logger: createLogger({
      service: "trpc-parity-test",
      env: "test",
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

const createCaller = createCallerFactory(appRouter);

async function trpcVoidOutcome(
  actor: Actor,
  db: ParityDb,
  ports: TrpcContext["ports"],
  invoiceId: string,
): Promise<{ ok: true } | { ok: false; code: string; httpStatus: number }> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test injects tx as Database
  const caller = createCaller(makeTrpcCtx(actor, db as TrpcContext["db"], ports));
  try {
    await caller.billing.void({ invoiceId: brandInvoiceId(invoiceId) });
    return { ok: true };
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined;
    if (isAppError(cause)) {
      return { ok: false, code: cause.code, httpStatus: cause.httpStatus };
    }
    throw error;
  }
}

async function restVoidOutcome(
  actor: Actor,
  db: ParityDb,
  ports: TrpcContext["ports"],
  organizationId: string,
  invoiceId: string,
): Promise<{ ok: true } | { ok: false; code: string; httpStatus: number }> {
  const app = createParityApp({ actor, db, ports });
  const response = await app.request(
    `/v1/organizations/${organizationId}/invoices/${invoiceId}/void`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
    },
  );

  if (response.status >= 200 && response.status < 300) {
    return { ok: true };
  }

  const body: unknown = await response.json();
  const code =
    typeof body === "object" && body !== null && "code" in body && typeof body.code === "string"
      ? body.code
      : "UNKNOWN";
  return { ok: false, code, httpStatus: response.status };
}

describe("tRPC vs REST authz parity (ADR-0003)", () => {
  it("forbids member void and allows owner void on both transports", async () => {
    await withTestTransaction(async ({ db, factories }) => {
      const org = await factories.makeOrganization();
      // Separate rows per transport so a successful void does not poison the other.
      const memberTrpcInvoice = await factories.makeInvoice({
        organizationId: org.id,
        number: "INV-PARITY-M-TRPC",
        status: "open",
        amountMinor: 1000,
      });
      const memberRestInvoice = await factories.makeInvoice({
        organizationId: org.id,
        number: "INV-PARITY-M-REST",
        status: "open",
        amountMinor: 1000,
      });
      const ownerTrpcInvoice = await factories.makeInvoice({
        organizationId: org.id,
        number: "INV-PARITY-O-TRPC",
        status: "open",
        amountMinor: 2000,
      });
      const ownerRestInvoice = await factories.makeInvoice({
        organizationId: org.id,
        number: "INV-PARITY-O-REST",
        status: "open",
        amountMinor: 2000,
      });

      const ports = createTestPorts();
      // Persisted users, not synthetic ids: voiding writes an audit row whose
      // actor_user_id is a foreign key into "user".
      const ownerUser = await factories.makeUser();
      const memberUser = await factories.makeUser();
      const owner = makeActor("owner", org.id, ownerUser.id);
      const member = makeActor("member", org.id, memberUser.id);

      const memberTrpc = await trpcVoidOutcome(member, db, ports, memberTrpcInvoice.id);
      const memberRest = await restVoidOutcome(member, db, ports, org.id, memberRestInvoice.id);

      expect(memberTrpc).toEqual({
        ok: false,
        code: ERROR_CODES.FORBIDDEN,
        httpStatus: 403,
      });
      expect(memberRest).toEqual(memberTrpc);

      const ownerTrpc = await trpcVoidOutcome(owner, db, ports, ownerTrpcInvoice.id);
      const ownerRest = await restVoidOutcome(owner, db, ports, org.id, ownerRestInvoice.id);

      expect(ownerTrpc).toEqual({ ok: true });
      expect(ownerRest).toEqual(ownerTrpc);
    });
  });
});
