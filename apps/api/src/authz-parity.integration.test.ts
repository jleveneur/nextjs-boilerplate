/**
 * ADR-0003 proof: the same Actor + core service yields identical authorization
 * outcomes over oRPC and REST.
 */

import { describe, expect, it } from "vitest";

import { permissionsForOrganizationRole } from "@repo/auth";
import { createTestPorts } from "@repo/core/testing";
import { setupDbIntegrationTests } from "@repo/db/testing";
import { ERROR_CODES, isAppError } from "@repo/errors";
import { createLogger } from "@repo/logger";
import { appRouter, createCallerFactory, type OrpcContext } from "@repo/orpc";
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

function makeOrpcCtx(
  actor: Actor,
  db: OrpcContext["db"],
  ports: OrpcContext["ports"],
): OrpcContext {
  return {
    actor,
    db,
    logger: createLogger({
      service: "orpc-parity-test",
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

async function orpcVoidOutcome(
  actor: Actor,
  db: ParityDb,
  ports: OrpcContext["ports"],
  invoiceId: string,
): Promise<{ ok: true } | { ok: false; code: string; httpStatus: number }> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test injects tx as Database
  const caller = createCaller(makeOrpcCtx(actor, db as OrpcContext["db"], ports));
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
  ports: OrpcContext["ports"],
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

describe("oRPC vs REST authz parity (ADR-0003)", () => {
  it("forbids member void and allows owner void on both transports", async () => {
    await withTestTransaction(async ({ db, factories }) => {
      const org = await factories.makeOrganization();
      // Separate rows per transport so a successful void does not poison the other.
      const memberRpcInvoice = await factories.makeInvoice({
        organizationId: org.id,
        number: "INV-PARITY-M-RPC",
        status: "open",
        amountMinor: 1000,
      });
      const memberRestInvoice = await factories.makeInvoice({
        organizationId: org.id,
        number: "INV-PARITY-M-REST",
        status: "open",
        amountMinor: 1000,
      });
      const ownerRpcInvoice = await factories.makeInvoice({
        organizationId: org.id,
        number: "INV-PARITY-O-RPC",
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

      const memberRpc = await orpcVoidOutcome(member, db, ports, memberRpcInvoice.id);
      const memberRest = await restVoidOutcome(member, db, ports, org.id, memberRestInvoice.id);

      expect(memberRpc).toEqual({
        ok: false,
        code: ERROR_CODES.FORBIDDEN,
        httpStatus: 403,
      });
      expect(memberRest).toEqual(memberRpc);

      const ownerRpc = await orpcVoidOutcome(owner, db, ports, ownerRpcInvoice.id);
      const ownerRest = await restVoidOutcome(owner, db, ports, org.id, ownerRestInvoice.id);

      expect(ownerRpc).toEqual({ ok: true });
      expect(ownerRest).toEqual(ownerRpc);
    });
  });
});
