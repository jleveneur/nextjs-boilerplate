import { Writable } from "node:stream";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { permissionsForRole } from "@repo/authz";
import { insertAuditLog } from "@repo/db";
import type * as DbModule from "@repo/db";
import { createLogger } from "@repo/logger";
import type { Actor, OrganizationId, UserId } from "@repo/types";

import type { Ctx } from "./ctx.ts";
import { systemActorForOrganization } from "./system-actor.ts";
import { createTestPorts } from "./testing/create-test-ports.ts";
import { writeAuditLog } from "./write-audit-log.ts";

vi.mock("@repo/db", async (importOriginal) => {
  const actual = await importOriginal<typeof DbModule>();
  return {
    ...actual,
    insertAuditLog: vi.fn(),
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

function humanActor(organizationId: OrganizationId): Actor {
  return {
    userId: brandUserId("01900000-0000-7000-8000-0000000000aa"),
    organizationId,
    role: "owner",
    permissions: permissionsForRole("owner"),
    isSystem: false,
  };
}

function makeCtx(actor: Actor): Ctx {
  return {
    actor,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- mocked executor
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
    ports: createTestPorts(),
  };
}

const organizationId = brandOrganizationId("01900000-0000-7000-8000-000000000001");
const input = {
  action: "invoice.voided",
  resourceType: "invoice",
  resourceId: "01900000-0000-7000-8000-000000000010",
  metadata: { previous_status: "open", status: "void" },
};

describe("writeAuditLog", () => {
  beforeEach(() => {
    vi.mocked(insertAuditLog).mockReset();
  });

  it("uses the active transaction and records the human actor", async () => {
    const ctx = makeCtx(humanActor(organizationId));
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- mocked transaction
    const tx = {} as NonNullable<Ctx["tx"]>;
    ctx.tx = tx;

    await writeAuditLog(ctx, input);

    expect(insertAuditLog).toHaveBeenCalledWith(tx, {
      organizationId,
      actorUserId: ctx.actor.userId,
      ...input,
    });
  });

  it("uses the database executor and omits a user for a system actor", async () => {
    const ctx = makeCtx(systemActorForOrganization(organizationId));

    await writeAuditLog(ctx, input);

    expect(insertAuditLog).toHaveBeenCalledWith(ctx.db, {
      organizationId,
      actorUserId: null,
      ...input,
    });
  });
});
