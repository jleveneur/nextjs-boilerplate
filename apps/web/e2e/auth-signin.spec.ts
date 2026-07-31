import { expect, test } from "@playwright/test";

import { expectNoAxeViolations } from "./helpers/axe.ts";
import { extractFirstHttpUrl, waitForMailTo } from "./helpers/mailpit.ts";

test.describe("sign in", () => {
  test("signs in with email and password after verification", async ({ page }) => {
    const stamp = Date.now();
    const email = `e2e.signin.${stamp}@example.com`;
    const password = "Password123!";

    await page.goto("/en/sign-up");
    await page.getByLabel(/name|nom/i).fill("Sign In User");
    await page.getByLabel(/email|e-mail/i).fill(email);
    await page.getByLabel(/password|mot de passe/i).fill(password);
    await page.getByRole("button", { name: /sign up|s'inscrire/i }).click();
    await expect(page).toHaveURL(/verify-email/);

    const mail = await waitForMailTo(email, "Verify");
    await page.goto(extractFirstHttpUrl(`${mail.HTML}\n${mail.Text}`));
    await expect(page).toHaveURL(/\/en\/[^/]+\/invoices/, { timeout: 15_000 });

    await page.getByRole("button", { name: /sign out|se déconnecter/i }).click();
    await page.goto("/en/sign-in");
    await expectNoAxeViolations(page);
    await page.getByLabel(/email|e-mail/i).fill(email);
    await page.getByLabel(/password|mot de passe/i).fill(password);
    await page.getByRole("button", { name: /^sign in$|^se connecter$/i }).click();

    await expect(page).toHaveURL(/\/en\/[^/]+\/invoices/, { timeout: 15_000 });
    await expectNoAxeViolations(page);
  });
});
