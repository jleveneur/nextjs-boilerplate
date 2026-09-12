import { expect, test } from "@playwright/test"

import { signOut, signUpAndVerify, uniqueEmail } from "./helpers/auth.ts"
import { waitForEmailLink } from "./helpers/outbox.ts"

test("an owner can invite someone, and they can join", async ({ page }) => {
  const ownerEmail = uniqueEmail("owner")
  const inviteeEmail = uniqueEmail("invitee")

  await signUpAndVerify(page, "Ada Lovelace", ownerEmail)

  const organization = await page.getByRole("heading", { level: 1 }).textContent()
  expect(organization).toBeTruthy()

  await page.getByLabel("Invite by email").fill(inviteeEmail)
  await page.getByRole("button", { name: "Invite" }).click()

  await expect(page.getByRole("status")).toContainText(inviteeEmail)
  // The pending invitation shows up in the members list, not just the toast.
  await expect(page.getByRole("listitem").filter({ hasText: inviteeEmail })).toContainText(
    "invited",
  )

  const invitationLink = await waitForEmailLink(inviteeEmail, /^join /i)

  // The invitee is a different person with their own account and their own
  // personal organization — joining must add a second one, not replace it.
  await signOut(page)
  await signUpAndVerify(page, "Grace Hopper", inviteeEmail)

  await page.goto(invitationLink)
  await page.getByRole("button", { name: "Accept invitation" }).click()

  await page.waitForURL("**/dashboard")
  await expect(page.getByRole("combobox", { name: "Organization" })).toContainText(
    organization ?? "",
  )
})

test("an invitation cannot be accepted by a different account", async ({ page }) => {
  const ownerEmail = uniqueEmail("owner")
  const inviteeEmail = uniqueEmail("invitee")
  const strangerEmail = uniqueEmail("stranger")

  await signUpAndVerify(page, "Ada Lovelace", ownerEmail)
  await page.getByLabel("Invite by email").fill(inviteeEmail)
  await page.getByRole("button", { name: "Invite" }).click()
  await expect(page.getByRole("status")).toContainText(inviteeEmail)

  const invitationLink = await waitForEmailLink(inviteeEmail, /^join /i)

  await signOut(page)
  await signUpAndVerify(page, "Someone Else", strangerEmail)

  await page.goto(invitationLink)
  await page.getByRole("button", { name: "Accept invitation" }).click()

  await expect(page.locator("main").getByRole("alert")).not.toBeEmpty()
  await expect(page).toHaveURL(/\/accept-invitation\//)
})
