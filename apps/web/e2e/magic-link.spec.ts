import { expect, test } from "@playwright/test";

import { expectNoAxeViolations } from "./helpers/axe.ts";
import { extractFirstHttpUrl, waitForMailTo } from "./helpers/mailpit.ts";

test.describe("magic link", () => {
  test("requests a magic link for an existing verified user", async ({ page }) => {
    const stamp = Date.now();
    const email = `e2e.magic.${stamp}@example.com`;
    const password = "Password123!";

    await page.goto("/en/sign-up");
    await page.getByLabel(/name|nom/i).fill("Magic User");
    await page.getByLabel(/email|e-mail/i).fill(email);
    await page.getByLabel(/password|mot de passe/i).fill(password);
    await page.getByRole("button", { name: /sign up|s'inscrire/i }).click();
    const verifyMail = await waitForMailTo(email, "Verify");
    await page.goto(extractFirstHttpUrl(`${verifyMail.HTML}\n${verifyMail.Text}`));
    await expect(page).toHaveURL(/\/en\/[^/]+\/invoices/, { timeout: 15_000 });

    await page.getByRole("button", { name: /sign out|se déconnecter/i }).click();
    await page.goto("/en/magic-link");
    await expectNoAxeViolations(page);
    await page.getByLabel(/email|e-mail/i).fill(email);
    await page.getByRole("button", { name: /magic link|lien magique|send|envoyer/i }).click();

    const magicMail = await waitForMailTo(email, "magic");
    await page.goto(extractFirstHttpUrl(`${magicMail.HTML}\n${magicMail.Text}`));
    await expect(page).toHaveURL(/\/en\/[^/]+\/invoices/, { timeout: 15_000 });
  });
});
