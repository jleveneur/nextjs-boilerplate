import { expect, test, type Page } from "@playwright/test";

import { expectNoAxeViolations } from "./helpers/axe.ts";
import { extractFirstHttpUrl, waitForMailTo } from "./helpers/mailpit.ts";

async function signUpAndEnterApp(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/en/sign-up");
  await page.getByLabel(/name/i).fill("Settings User");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign up/i }).click();
  const mail = await waitForMailTo(email, "Verify");
  await page.goto(extractFirstHttpUrl(`${mail.HTML}\n${mail.Text}`));
  await expect(page).toHaveURL(/\/en\/[^/]+\/invoices/, { timeout: 15_000 });
}

test.describe("settings", () => {
  test("updates the profile name and creates an API key", async ({ page }) => {
    const stamp = Date.now();
    const email = `e2e.settings.${stamp}@example.com`;
    const password = "Password123!";
    await signUpAndEnterApp(page, email, password);

    await expect(page.getByRole("button", { name: "Language" })).toBeVisible();
    await page.getByRole("button", { name: "Language" }).click();
    await expect(page.getByRole("link", { name: "Paramètres" })).toBeVisible();
    await page.getByRole("button", { name: "Langue" }).click();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();

    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: "Account" }).click();
    await expect(page).toHaveURL(/\/settings\/account/);
    await expect(page.getByRole("button", { name: "Save profile" })).toBeVisible();
    await expect(page.getByText("Two-factor authentication", { exact: true })).toBeVisible();
    await expect(page.getByText("Passkeys", { exact: true })).toBeVisible();

    await page.locator("#profile-name").fill("Settings User Updated");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile updated.")).toBeVisible();

    await page.getByRole("link", { name: "Members" }).click();
    await expect(page).toHaveURL(/\/settings\/members/);
    await expect(page.getByRole("button", { name: "Send invitation" })).toBeVisible();

    await page.getByRole("link", { name: "API keys" }).click();
    await expect(page).toHaveURL(/\/settings\/api-keys/);
    await page.getByLabel("Key name").fill("e2e-key");
    await page.getByRole("button", { name: "Create key" }).click();
    await expect(page.getByRole("status").locator("code")).toHaveText(/^sk_test_/);
    await expect(page.getByRole("cell", { name: "e2e-key" })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
