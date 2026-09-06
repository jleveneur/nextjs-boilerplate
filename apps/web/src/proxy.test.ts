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

    it.each([
      ["the oRPC handler", "/api/rpc"],
      ["a nested oRPC path", "/api/rpc/billing/listInvoices"],
      ["the Better Auth catch-all", "/api/auth/sign-in/email"],
      ["the health probe", "/api/health"],
    ])("sets them on %s", (_label, pathname) => {
      // These are the app's own transport surface. `nosniff` is the one that
      // earns its place here: without it a browser may re-interpret a JSON body
      // as HTML, which is how a reflected value in an error response becomes
      // script. The matcher used to exclude `api` outright, so none were set.
      const response = proxy(request(pathname));

      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
      expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    });
  });

  describe("api routes", () => {
    it.each([["/api/rpc"], ["/api/auth/sign-in/email"], ["/api/health"]])(
      "does not redirect %s",
      (pathname) => {
        // Locale routing would rewrite these to `/en/api/...` and the handler
        // would never run. Asserted per path rather than once, because the
        // i18n middleware treats an unprefixed path as one to redirect.
        const response = proxy(request(pathname));

        expect(redirectTarget(response)).toBeUndefined();
        expect(response.status).toBe(200);
      },
    );

    it("does not cookie-gate an unauthenticated api call", () => {
      // An RPC client sends `Accept: application/json` and cannot act on a 307
      // to an HTML sign-in page. Authentication for these routes happens in the
      // handler, which answers with a typed error the client understands.
      const response = proxy(request("/api/rpc/billing/listInvoices"));

      expect(redirectTarget(response)).toBeUndefined();
    });

    it("does not treat a product route merely containing 'api' as an api path", () => {
      // `startsWith("/api/")` rather than `includes("api")`: an organization
      // slugged "api-team" owns a real page that still needs the session gate.
      const response = proxy(request("/en/api-team/invoices"));

      expect(redirectTarget(response)?.pathname).toBe("/en/sign-in");
    });
  });
});
