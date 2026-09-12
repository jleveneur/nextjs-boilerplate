import { expect, test } from "@playwright/test";

/**
 * The form layer owns validation, and says so out loud.
 *
 * `type="email"` makes the browser refuse a malformed address on its own, and
 * it does that by cancelling submission before any handler runs — no message
 * from us, no request, nothing the page can show. `noValidate` on the form is
 * what hands the decision back to the schema; without it this reads as a
 * button that does nothing.
 */
test("a malformed address is reported, and never reaches the server", async ({ page }) => {
  const authCalls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/auth/")) authCalls.push(request.url());
  });

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("whatever");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.locator("main").getByRole("alert").first()).toHaveText(/valid email/i);
  expect(authCalls).toHaveLength(0);
});

test("an empty form reports every missing field at once", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Sign in" }).click();

  const alerts = page.locator("main").getByRole("alert");
  await expect(alerts).toHaveCount(2);
  await expect(alerts.first()).toHaveText(/valid email/i);
  await expect(alerts.last()).toHaveText(/password/i);
});
