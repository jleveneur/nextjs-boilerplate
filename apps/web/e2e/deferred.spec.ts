import { test } from "@playwright/test";

/**
 * Journeys that need extra harnesses:
 * - OAuth: mocked IdP at the network boundary
 * - Passkey: WebAuthn virtual authenticator fixture
 * - 2FA enroll: TOTP secret extraction + authenticator
 * - File upload: no product upload surface yet
 *
 * Stripe Checkout: see `billing-stripe.spec.ts` (skips without test keys).
 */
test.describe("deferred journeys", () => {
  test.skip("oauth mocked sign-in", () => {});
  test.skip("passkey virtual authenticator", () => {});
  test.skip("two-factor enroll and sign-in", () => {});
  test.skip("organization invite accept (second user)", () => {});
  test.skip("file upload", () => {});
});
