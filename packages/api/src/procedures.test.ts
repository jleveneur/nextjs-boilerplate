import { call, ORPCError } from "@orpc/server"
import { describe, expect, it } from "vitest"

import type { Session } from "@repo/auth"

import type { Context } from "./context.ts"
import { orgProcedure, protectedProcedure, publicProcedure } from "./procedures.ts"

const whoami = protectedProcedure.handler(({ context }) => context.user.id)
const tenant = orgProcedure.handler(({ context }) => context.organizationId)
const ping = publicProcedure.handler(() => "pong")

const headers = new Headers()

// Only the fields the guards read. A full Better Auth session is a wide type
// and reconstructing it here would test the fixture, not the guard.
function sessionWith(activeOrganizationId: string | null): Session {
  return { user: { id: "user_123" }, session: { activeOrganizationId } } as unknown as Session
}

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  const error: unknown = await promise.then(() => undefined).catch((cause: unknown) => cause)

  if (!(error instanceof ORPCError)) {
    return undefined
  }

  // `ORPCError` is generic over its code, so `instanceof` narrows it to `any`.
  const code: unknown = error.code
  return typeof code === "string" ? code : undefined
}

describe("publicProcedure", () => {
  it("runs without a session", async () => {
    await expect(call(ping, undefined, { context: { session: null, headers } })).resolves.toBe(
      "pong",
    )
  })
})

describe("protectedProcedure", () => {
  it("rejects an anonymous caller with UNAUTHORIZED", async () => {
    const context: Context = { session: null, headers }

    await expect(codeOf(call(whoami, undefined, { context }))).resolves.toBe("UNAUTHORIZED")
  })

  it("passes the signed-in user to the handler", async () => {
    const context: Context = { session: sessionWith("org_1"), headers }

    await expect(call(whoami, undefined, { context })).resolves.toBe("user_123")
  })
})

describe("orgProcedure", () => {
  it("rejects a session with no active organization", async () => {
    const context: Context = { session: sessionWith(null), headers }

    await expect(codeOf(call(tenant, undefined, { context }))).resolves.toBe("FORBIDDEN")
  })

  it("still rejects an anonymous caller", async () => {
    const context: Context = { session: null, headers }

    await expect(codeOf(call(tenant, undefined, { context }))).resolves.toBe("UNAUTHORIZED")
  })

  it("exposes the active organization to the handler", async () => {
    const context: Context = { session: sessionWith("org_1"), headers }

    await expect(call(tenant, undefined, { context })).resolves.toBe("org_1")
  })
})
