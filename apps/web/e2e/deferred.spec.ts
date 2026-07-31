import { test } from "@playwright/test";

/**
 * Journeys that need extra harnesses in this phase:
 * - OAuth: mocked IdP at the network boundary (Phase 11/CI polish)
 * - Passkey: WebAuthn virtual authenticator fixture
 * - 2FA enroll: TOTP secret extraction + authenticator
 * - File upload: no product upload surface yet
 * - Stripe checkout: Phase 17
 */
test.describe("deferred journeys", () => {
  test.skip("oauth mocked sign-in", () => {});
  test.skip("passkey virtual authenticator", () => {});
  test.skip("two-factor enroll and sign-in", () => {});
  test.skip("organization invite accept (second user)", () => {});
  test.skip("file upload", () => {});
});
