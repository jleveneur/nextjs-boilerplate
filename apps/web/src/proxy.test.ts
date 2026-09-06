import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import proxy from "./proxy.ts";

const ORIGIN = "https://web.localhost";

function request(pathname: string, cookie?: string): NextRequest {
  const headers = new Headers();
  if (cookie !== undefined) {
    headers.set("cookie", cookie);
  }
  return new NextRequest(new URL(pathname, ORIGIN), { headers });
}

const SESSION = "better-auth.session_token=abc";
const SECURE_SESSION = "__Secure-better-auth.session_token=abc";

function redirectTarget(response: Response): URL | undefined {
  const location = response.headers.get("location");
  return location === null ? undefined : new URL(location, ORIGIN);
}

describe("proxy", () => {
  describe("session gate", () => {
    it.each([["/en/acme/invoices"], ["/en/acme/settings"], ["/fr/acme/billing"]])(
      "redirects %s to sign-in without a session cookie",
      (pathname) => {
        const response = proxy(request(pathname));
        const target = redirectTarget(response);

        expect(response.status).toBe(307);
        expect(target?.pathname).toMatch(/\/sign-in$/);
        // The gate preserves where the user was going so sign-in can resume it.
        expect(target?.searchParams.get("next")).toBe(pathname);
      },
    );

    it("keeps the requested locale on the sign-in redirect", () => {
      expect(redirectTarget(proxy(request("/fr/acme/invoices")))?.pathname).toBe("/fr/sign-in");
    });

    it.each([
      ["a plain session cookie", SESSION],
      ["a secure-prefixed session cookie", SECURE_SESSION],
    ])("lets a request through with %s", (_label, cookie) => {
      const response = proxy(request("/en/acme/invoices", cookie));

      expect(redirectTarget(response)?.pathname).not.toBe("/en/sign-in");
    });

    it("does not treat an unrelated cookie as a session", () => {
      const response = proxy(request("/en/acme/invoices", "theme=dark"));

      expect(redirectTarget(response)?.pathname).toBe("/en/sign-in");
    });

    it.each([
      "/en",
      "/en/sign-in",
      "/en/sign-up",
      "/en/verify-email",
      "/en/forgot-password",
      "/en/reset-password",
      "/en/magic-link",
      "/en/two-factor",
      "/en/accept-invitation",
      "/en/passkey",
      "/en/continue",
    ])("does not gate the public route %s", (pathname) => {
      const response = proxy(request(pathname));

      expect(redirectTarget(response)?.pathname).not.toBe("/en/sign-in");
    });

    it("does not gate a path with no recognised locale", () => {
      // Locale negotiation owns these; gating before that would redirect to a
      // sign-in URL under a locale that does not exist.
      const response = proxy(request("/acme/invoices"));

      expect(redirectTarget(response)?.pathname).not.toBe("/sign-in");
    });
  });

  describe("analytics ingest", () => {
    it("passes /ingest through untouched", () => {
      const response = proxy(request("/ingest/decide"));

      expect(redirectTarget(response)).toBeUndefined();
      // Not locale-prefixed and not cookie-gated: the SDK posts here anonymously.
      expect(response.headers.get("X-Frame-Options")).toBeNull();
    });
  });

  describe("security headers", () => {
    it("sets them on a gated redirect", () => {
      const response = proxy(request("/en/acme/invoices"));

      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
      expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
      expect(response.headers.get("Permissions-Policy")).toBe(
        "camera=(), microphone=(), geolocation=()",
      );
    });

    it("sets them on a normally routed request", () => {
      const response = proxy(request("/en/sign-in"));

      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    });
  });
});
