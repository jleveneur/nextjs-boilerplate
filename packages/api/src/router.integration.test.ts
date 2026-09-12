import { call } from "@orpc/server"
import { eq, sql } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { auth } from "@repo/auth"
import { db, member, post, user } from "@repo/db"

import { createContext } from "./context.ts"
import { appRouter } from "./router.ts"

/**
 * The seam the unit tests cannot reach.
 *
 * Guards and role grants are pure and tested as such. What is only observable
 * against a real database is the wiring between them: Better Auth writing
 * through the Drizzle adapter, the session hook resolving an organization, and
 * a permission check reading the member row it actually wrote. That wiring is
 * where an upstream version bump breaks things silently.
 *
 * Requires a database. Apply migrations first: `pnpm db:migrate`.
 */

const PASSWORD = "correct-horse-battery"

function toRequestHeaders(response: Response): Headers {
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ")

  return new Headers({ cookie })
}

/**
 * Creates a signed-in user.
 *
 * Addresses must be verified, so signing up produces no session — the link in
 * the email does. Rather than parse that email, this marks the row verified
 * and signs in. The verification journey itself is covered end to end by the
 * Playwright suite, where clicking the real link is the point.
 */
async function signUp(email: string): Promise<{ headers: Headers; userId: string }> {
  await auth.api.signUpEmail({
    body: { name: "Test User", email, password: PASSWORD },
    asResponse: true,
  })

  await db.update(user).set({ emailVerified: true }).where(eq(user.email, email))

  const headers = await signIn(email)
  const session = await auth.api.getSession({ headers })

  if (session === null) {
    throw new Error(`Could not sign in as ${email}`)
  }

  return { headers, userId: session.user.id }
}

async function signIn(email: string): Promise<Headers> {
  const response = await auth.api.signInEmail({
    body: { email, password: PASSWORD },
    asResponse: true,
  })

  return toRequestHeaders(response)
}

beforeEach(async () => {
  await db.execute(
    sql`truncate table "user", "session", "account", "verification", "organization", "member", "invitation", "post" cascade`,
  )
})

describe("sign-up", () => {
  it("does not sign in an unverified address", async () => {
    const response = await auth.api.signUpEmail({
      body: { name: "Test User", email: "unverified@example.test", password: PASSWORD },
      asResponse: true,
    })

    await expect(auth.api.getSession({ headers: toRequestHeaders(response) })).resolves.toBeNull()
  })

  it("puts the new user in an organization they own", async () => {
    const { headers } = await signUp("owner@example.test")

    const current = await call(appRouter.organization.current, undefined, {
      context: await createContext(headers),
    })

    expect(current.role).toBe("owner")
    expect(current.name).toBe("Test User's workspace")
  })
})

describe("post", () => {
  it("scopes what it writes and reads to the active organization", async () => {
    const { headers } = await signUp("owner@example.test")
    const context = await createContext(headers)

    const created = await call(appRouter.post.create, { title: "first" }, { context })
    const listed = await call(appRouter.post.list, undefined, { context })

    expect(listed.map((row) => row.title)).toStrictEqual(["first"])
    expect(created.organizationId).toBe(listed[0]?.organizationId)
  })

  it("does not leak one organization's rows to another", async () => {
    const owner = await signUp("owner@example.test")
    await call(
      appRouter.post.create,
      { title: "private" },
      { context: await createContext(owner.headers) },
    )

    const stranger = await signUp("stranger@example.test")
    const visible = await call(appRouter.post.list, undefined, {
      context: await createContext(stranger.headers),
    })

    expect(visible).toStrictEqual([])
  })

  it("refuses a delete the caller's role does not grant", async () => {
    const { headers, userId } = await signUp("owner@example.test")
    const created = await call(
      appRouter.post.create,
      { title: "keep me" },
      {
        context: await createContext(headers),
      },
    )

    await db.update(member).set({ role: "member" }).where(eq(member.userId, userId))

    await expect(
      call(appRouter.post.delete, { id: created.id }, { context: await createContext(headers) }),
    ).rejects.toThrow(/does not allow/)

    const survivors = await db.select().from(post).where(eq(post.id, created.id))
    expect(survivors).toHaveLength(1)
  })

  it("allows a delete the caller's role does grant", async () => {
    const { headers } = await signUp("owner@example.test")
    const context = await createContext(headers)
    const created = await call(appRouter.post.create, { title: "delete me" }, { context })

    await call(appRouter.post.delete, { id: created.id }, { context })

    expect(await db.select().from(post).where(eq(post.id, created.id))).toStrictEqual([])
  })
})

describe("organization switching", () => {
  it("remembers the choice across sessions", async () => {
    const { headers } = await signUp("owner@example.test")

    const second = await auth.api.createOrganization({
      headers,
      body: { name: "Second", slug: "second" },
    })
    if (second === null) {
      throw new Error("Could not create the second organization")
    }

    await auth.api.setActiveOrganization({ headers, body: { organizationId: second.id } })

    // A fresh sign-in builds a new session, which is where a choice stored
    // only on the old session would be lost.
    const current = await call(appRouter.organization.current, undefined, {
      context: await createContext(await signIn("owner@example.test")),
    })

    expect(current.id).toBe(second.id)
  })

  it("lists every organization the caller belongs to", async () => {
    const { headers } = await signUp("owner@example.test")
    await auth.api.createOrganization({ headers, body: { name: "Second", slug: "second" } })

    const listed = await call(appRouter.organization.list, undefined, {
      context: await createContext(headers),
    })

    expect(listed.map((row) => row.name)).toStrictEqual(["Test User's workspace", "Second"])
    expect(listed.every((row) => row.role === "owner")).toBe(true)
  })

  it("does not list another user's organizations", async () => {
    await signUp("owner@example.test")
    const outsider = await signUp("outsider@example.test")

    const listed = await call(appRouter.organization.list, undefined, {
      context: await createContext(outsider.headers),
    })

    expect(listed).toHaveLength(1)
    expect(listed[0]?.name).toBe("Test User's workspace")
  })
})
