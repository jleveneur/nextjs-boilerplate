import { call, ORPCError } from "@orpc/server";
import { describe, expect, it } from "vitest";

import type { Session } from "@repo/auth";

import type { Context } from "./context.ts";
import { protectedProcedure, publicProcedure } from "./procedures.ts";

const whoami = protectedProcedure.handler(({ context }) => context.user.id);
const ping = publicProcedure.handler(() => "pong");

// Only the field the guard reads. A full Better Auth session is a wide type and
// reconstructing it here would test the fixture, not the guard.
const session = { user: { id: "user_123" } } as unknown as Session;

describe("protectedProcedure", () => {
  it("rejects an anonymous caller with UNAUTHORIZED", async () => {
    const context: Context = { session: null };

    const error = await call(whoami, undefined, { context }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ORPCError);
    expect((error as ORPCError<string, unknown>).code).toBe("UNAUTHORIZED");
  });

  it("passes the signed-in user to the handler", async () => {
    await expect(call(whoami, undefined, { context: { session } })).resolves.toBe("user_123");
  });
});

describe("publicProcedure", () => {
  it("runs without a session", async () => {
    await expect(call(ping, undefined, { context: { session: null } })).resolves.toBe("pong");
  });
});
