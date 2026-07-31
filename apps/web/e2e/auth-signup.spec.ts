import { expect, test } from "@playwright/test";

import { expectNoAxeViolations } from "./helpers/axe.ts";
import { extractFirstHttpUrl, waitForMailTo } from "./helpers/mailpit.ts";

test.describe("sign up and verify", () => {
  test("creates an account, verifies email, and reaches the app", async ({ page }) => {
    const stamp = Date.now();
    const email = `e2e.signup.${stamp}@example.com`;
    const password = "Password123!";

    await page.goto("/en");
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: /create account|créer un compte/i }).click();
    await expect(page).toHaveURL(/\/en\/sign-up/);
    await expectNoAxeViolations(page);

    await page.getByLabel(/name|nom/i).fill("E2E User");
    await page.getByLabel(/email|e-mail/i).fill(email);
    await page.getByLabel(/password|mot de passe/i).fill(password);
    await page.getByRole("button", { name: /sign up|s'inscrire/i }).click();

    await expect(page).toHaveURL(/verify-email/);

    const mail = await waitForMailTo(email, "Verify");
    const verifyUrl = extractFirstHttpUrl(`${mail.HTML}\n${mail.Text}`);
    await page.goto(verifyUrl);

    await expect(page).toHaveURL(/\/en\/[^/]+\/invoices/, { timeout: 15_000 });
    await expectNoAxeViolations(page);
  });
});
