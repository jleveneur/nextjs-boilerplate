import { expect, test } from "@playwright/test";

/**
 * Stripe Checkout / Customer Portal need live test-mode keys.
 * Skip when unset so CI stays green without Stripe credentials.
 */
const hasStripe =
  process.env["STRIPE_SECRET_KEY"] !== undefined &&
  process.env["STRIPE_SECRET_KEY"] !== "" &&
  process.env["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"] !== undefined &&
  process.env["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"] !== "";

test.describe("stripe billing", () => {
  test.skip(!hasStripe, "requires STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");

  test("sign-in is reachable when Stripe keys are configured", async ({ page }) => {
    // Checkout and Customer Portal are a Stripe CLI / test-mode drill.
    // The billing page is always in the signed-in nav (no feature flag).
    await page.goto("/en/sign-in");
    await expect(page.getByRole("heading", { name: /sign in|connexion/i })).toBeVisible();
  });
});
