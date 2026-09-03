import { expect, test, type Page } from "@playwright/test";

import { expectNoAxeViolations } from "./helpers/axe.ts";
import { extractFirstHttpUrl, waitForMailTo } from "./helpers/mailpit.ts";

async function signUpAndEnterApp(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/en/sign-up");
  await page.getByLabel(/name|nom/i).fill("Billing User");
  await page.getByLabel(/email|e-mail/i).fill(email);
  await page.getByLabel(/password|mot de passe/i).fill(password);
  await page.getByRole("button", { name: /sign up|s'inscrire/i }).click();
  const mail = await waitForMailTo(email, "Verify");
  await page.goto(extractFirstHttpUrl(`${mail.HTML}\n${mail.Text}`));
  await expect(page).toHaveURL(/\/en\/[^/]+\/invoices/, { timeout: 15_000 });
}

test.describe("billing invoices", () => {
  test("creates, lists, and voids an invoice", async ({ page }) => {
    const stamp = Date.now();
    const email = `e2e.billing.${stamp}@example.com`;
    const password = "Password123!";
    await signUpAndEnterApp(page, email, password);

    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: /create invoice|créer une facture/i }).click();
    await expect(page).toHaveURL(/\/invoices\/new/);

    const number = `INV-${stamp}`;
    await page.getByLabel(/number|numéro/i).fill(number);
    await page.getByLabel(/amount|montant|minor/i).fill("2500");
    await page.getByRole("button", { name: /^create invoice$|^créer une facture$/i }).click();

    await expect(page).toHaveURL(/\/invoices\/[^/]+$/);
    await expect(page.getByRole("heading", { name: number })).toBeVisible();
    await expectNoAxeViolations(page);

    const voidButton = page.getByRole("button", { name: /void|annuler/i });
    if (await voidButton.isVisible()) {
      await voidButton.click();
      await expect(page.getByText(/void/i)).toBeVisible();
    }

    await page
      .getByRole("link", { name: /invoices|factures/i })
      .first()
      .click();
    await expect(page.getByRole("link", { name: number })).toBeVisible();
  });
});
