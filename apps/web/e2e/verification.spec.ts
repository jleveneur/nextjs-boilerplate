import { expect, test } from "@playwright/test"

import { PASSWORD, signIn, uniqueEmail } from "./helpers/auth.ts"
import { waitForEmailLink } from "./helpers/outbox.ts"

test("sign-up does not sign you in until the address is confirmed", async ({ page }) => {
  const email = uniqueEmail("verify")

  await page.goto("/sign-up")
  await page.getByLabel("Name").fill("Ada Lovelace")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(PASSWORD)
  await page.getByRole("button", { name: "Create account" }).click()

  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible()
  await expect(page.getByText(`We sent a confirmation link to ${email}`)).toBeVisible()

  // The session is what is being tested: the dashboard must still turn us away.
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/sign-in/)

  // Signing in is refused too — the password is right, the address is not
  // confirmed. Scoped to `main`, and asserted on its text: Next renders an
  // empty alert region of its own, which a bare role query would match.
  await signIn(page, email)
  await expect(page.locator("main").getByRole("alert")).not.toBeEmpty()
  await expect(page).toHaveURL(/\/sign-in/)

  await page.goto(await waitForEmailLink(email, /confirm your email/i))

  await expect(page).toHaveURL(/\/dashboard/)
  // Scoped to the header: the address also appears in the members list. A
  // `banner` role query would not match — this header is inside `main`.
  await expect(page.locator("header")).toContainText(email)
})
