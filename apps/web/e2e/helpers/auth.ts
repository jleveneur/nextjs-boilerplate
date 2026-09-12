import type { Page } from "@playwright/test";

import { waitForEmailLink } from "./outbox.ts";

export const PASSWORD = "correct-horse-battery";

/** A fresh address per call, so specs never collide on the unique email index. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.test`;
}

/**
 * Signs up and follows the verification link, leaving the page signed in.
 *
 * The link is how a real user gets a session — verification is required, so
 * sign-up alone does not produce one.
 */
export async function signUpAndVerify(page: Page, name: string, email: string): Promise<void> {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  await page.waitForURL("**/verify-email**");

  await page.goto(await waitForEmailLink(email, /confirm your email/i));
  await page.waitForURL("**/dashboard");
}

export async function signIn(page: Page, email: string, password = PASSWORD): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function signOut(page: Page): Promise<void> {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Sign out" }).click();
  // Waiting for the home page's own heading rather than a URL glob: `**/`
  // matches almost anything, including the page we are leaving.
  await page.getByRole("heading", { name: "Next.js starter" }).waitFor();
}
