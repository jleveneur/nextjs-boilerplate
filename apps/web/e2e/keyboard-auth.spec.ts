import { test } from "@playwright/test";

import { expectNoAxeViolations } from "./helpers/axe.ts";
import { expectKeyboardReachableSubmit } from "./helpers/keyboard.ts";

test.describe("keyboard auth surfaces", () => {
  test("sign-in submit is reachable by Tab and page has no axe violations", async ({ page }) => {
    await page.goto("/en/sign-in");
    await expectNoAxeViolations(page);
    await expectKeyboardReachableSubmit(page, /^sign in$|^se connecter$/i);
  });

  test("sign-up submit is reachable by Tab", async ({ page }) => {
    await page.goto("/en/sign-up");
    await expectNoAxeViolations(page);
    await expectKeyboardReachableSubmit(page, /sign up|s'inscrire/i);
  });

  test("magic-link submit is reachable by Tab", async ({ page }) => {
    await page.goto("/en/magic-link");
    await expectNoAxeViolations(page);
    await expectKeyboardReachableSubmit(page, /magic link|lien magique|send|envoyer/i);
  });
});
