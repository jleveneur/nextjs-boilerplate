import { expect, test } from "@playwright/test";

import { PASSWORD, signIn, signOut, signUpAndVerify, uniqueEmail } from "./helpers/auth.ts";
import { waitForEmailLink } from "./helpers/outbox.ts";

const NEW_PASSWORD = "a-different-correct-horse";

test("a forgotten password can be reset and then used", async ({ page }) => {
  const email = uniqueEmail("reset");
  await signUpAndVerify(page, "Ada Lovelace", email);
  await signOut(page);

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(page.getByRole("status")).toContainText("on its way");

  await page.goto(await waitForEmailLink(email, /reset your password/i));

  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  await page.getByLabel("New password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Set new password" }).click();

  // Resetting does not sign anyone in; the new password has to be used.
  await page.waitForURL("**/sign-in**");

  await signIn(page, email, PASSWORD);
  await expect(page.locator("main").getByRole("alert")).not.toBeEmpty();

  await signIn(page, email, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard/);
});

test("an address with no account is told the same thing as one that has", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill("nobody@example.test");
  await page.getByRole("button", { name: "Send reset link" }).click();

  // Anything else lets an attacker enumerate who has an account.
  await expect(page.getByRole("status")).toContainText("If an account exists");
});
