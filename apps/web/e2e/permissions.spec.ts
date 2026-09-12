import { expect, test } from "@playwright/test"
import { eq } from "drizzle-orm"

import { db, member, user } from "@repo/db"

import { signUpAndVerify, uniqueEmail } from "./helpers/auth.ts"

/**
 * What a role hides, and what it refuses.
 *
 * The first half is cosmetic — the controls a member should not see. The
 * second half is the part that matters: calling the procedure anyway is
 * rejected server-side, which is what makes hiding the button a convenience
 * rather than the security boundary.
 */
test("a member sees no delete or invite controls, and cannot delete via the API", async ({
  page,
}) => {
  const email = uniqueEmail("demoted")
  await signUpAndVerify(page, "Ada Lovelace", email)

  await page.getByPlaceholder("Write something…").fill("owned by the organization")
  await page.getByRole("button", { name: "Add" }).click()
  await expect(page.getByText("owned by the organization")).toBeVisible()

  // As owner, both controls are available.
  await expect(page.getByRole("button", { name: "Delete" })).toBeVisible()
  await expect(page.getByLabel("Invite by email")).toBeVisible()

  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
  expect(row).toBeDefined()
  await db
    .update(member)
    .set({ role: "member" })
    .where(eq(member.userId, row?.id ?? ""))

  await page.reload()

  await expect(page.getByText("owned by the organization")).toBeVisible()
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0)
  await expect(page.getByLabel("Invite by email")).toHaveCount(0)

  // The control is gone from the page; the rule lives on the server. This uses
  // `page.request` rather than the `request` fixture so it carries the signed-in
  // session — the isolated fixture would be refused for being anonymous, which
  // would prove nothing about the role.
  const posts = await page.request.post("/api/rpc/post/list", { data: {} })
  const id = extractFirstPostId(await posts.json())

  const refused = await page.request.post("/api/rpc/post/delete", { data: { json: { id } } })
  expect(refused.status()).toBe(403)
})

/** The RPC envelope is `{ json: [...] }`; this digs out the first row's id. */
function extractFirstPostId(payload: unknown): string {
  if (typeof payload === "object" && payload !== null && "json" in payload) {
    const rows: unknown = payload.json

    if (Array.isArray(rows) && rows.length > 0) {
      const first: unknown = rows[0]

      if (typeof first === "object" && first !== null && "id" in first) {
        const id: unknown = first.id
        if (typeof id === "string") return id
      }
    }
  }

  throw new Error("post.list returned no rows")
}
