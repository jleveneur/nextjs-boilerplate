import { test } from "@playwright/test";

/**
 * Journeys that need extra harnesses (the settings UI for passkeys, TOTP
 * enroll, and invite send already exists; these skips are the missing
 * fixtures, not missing screens):
 * - OAuth: mocked IdP at the network boundary
 * - Passkey: WebAuthn virtual authenticator fixture
 * - 2FA enroll: TOTP secret extraction + authenticator
 * - Invite accept: second user + Mailpit
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
