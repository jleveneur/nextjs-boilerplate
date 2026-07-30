import { can, PERMISSIONS } from "@repo/authz";
import { user } from "@repo/db/schema";
import { setupDbIntegrationTests } from "@repo/db/testing";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createAuth, type Auth } from "./create-auth.ts";
import { resolveActorFromApiKey, resolveActorFromSession } from "./resolve-actor.ts";
import { createRecordingMailers } from "./testing/index.ts";

function requireRedisUrl(): string {
  const url = process.env["REDIS_URL"];
  if (url === undefined || url === "") {
    throw new Error("REDIS_URL is required for @repo/auth integration tests");
  }

  return url;
}

function cookieHeadersFrom(responseHeaders: Headers, base?: Headers): Headers {
  const headers = new Headers(base);
  const setCookies =
    typeof responseHeaders.getSetCookie === "function"
      ? responseHeaders.getSetCookie()
      : [responseHeaders.get("set-cookie")].filter(
          (value): value is string => value !== null && value !== "",
        );

  for (const setCookie of setCookies) {
    const [pair] = setCookie.split(";");
    if (pair === undefined || !pair.includes("=")) {
      continue;
    }

    const eqIndex = pair.indexOf("=");
    const name = pair.slice(0, eqIndex).trim();
    const value = pair.slice(eqIndex + 1).trim();
    // Replace prior cookie with the same name (impersonation rotates the session).
    const existing = headers.get("cookie");
    if (existing === null || existing === "") {
      headers.set("cookie", `${name}=${value}`);
      continue;
    }

    const parts = existing.split("; ").filter((part) => !part.startsWith(`${name}=`));
    parts.push(`${name}=${value}`);
    headers.set("cookie", parts.join("; "));
  }

  return headers;
}

describe("@repo/auth integration", () => {
  const { db } = setupDbIntegrationTests();
  const mailers = createRecordingMailers();
  const redisUrl = requireRedisUrl();

  let auth: Auth;
  let closeAuth: () => Promise<void>;

  afterAll(async () => {
    if (closeAuth !== undefined) {
      await closeAuth();
    }
  });

  it("signs up, verifies email, creates personal org, and resolves matching Actors", async () => {
    const created = createAuth({
      db,
      secret: "integration-test-better-auth-secret-32",
      baseURL: "http://localhost:3000",
      appEnv: "local",
      appName: "integration",
      redisUrl,
      cookieCache: false,
      sendVerificationEmail: (input) => mailers.sendVerificationEmail(input),
      sendMagicLink: (input) => mailers.sendMagicLink(input),
      sendInvitationEmail: (input) => mailers.sendInvitationEmail(input),
    });
    auth = created.auth;
    closeAuth = async () => {
      await created.close();
    };

    const email = `owner-${Date.now()}@example.com`;
    // Local-only fixture password for Better Auth signup/sign-in.
    const password = "IntegrationTestPassword123!"; // gitleaks:allow

    await auth.api.signUpEmail({
      body: { email, password, name: "Owner User" },
      returnHeaders: true,
    });

    const verification = mailers.sent.find((m) => m.kind === "verification" && m.to === email);
    expect(verification).toBeDefined();

    await auth.api.verifyEmail({
      query: { token: verification?.token ?? "" },
      returnHeaders: true,
    });

    const signIn = await auth.api.signInEmail({
      body: { email, password },
      returnHeaders: true,
    });
    const cookies = cookieHeadersFrom(signIn.headers);
    expect(cookies.get("cookie")).toBeTruthy();

    const orgs = await auth.api.listOrganizations({ headers: cookies });
    expect(orgs.length).toBeGreaterThanOrEqual(1);
    const personal = orgs[0];
    expect(personal).toBeDefined();

    const setActive = await auth.api.setActiveOrganization({
      body: { organizationId: personal?.id },
      headers: cookies,
      returnHeaders: true,
    });
    const activeHeaders = cookieHeadersFrom(setActive.headers, cookies);

    const sessionAfter = await auth.api.getSession({ headers: activeHeaders });
    expect(sessionAfter?.session.activeOrganizationId).toBe(personal?.id);

    const sessionActor = await resolveActorFromSession({ auth, headers: activeHeaders });
    expect(sessionActor).toBeDefined();
    expect(sessionActor?.role).toBe("owner");
    expect(sessionActor?.organizationId).toBe(personal?.id);

    // Passing `headers` marks the call as a client request: do not send
    // server-only fields (`permissions`, `remaining`, rate-limit knobs).
    // Metadata + organizationId are allowed; defaultPermissions come from config.
    const apiKeyResult = await auth.api.createApiKey({
      body: {
        name: "integration",
        organizationId: personal?.id ?? "",
        metadata: { userId: sessionActor?.userId },
      },
      headers: activeHeaders,
    });

    expect(apiKeyResult.key).toMatch(/^sk_test_/);

    const keyActor = await resolveActorFromApiKey({
      auth,
      key: apiKeyResult.key,
      fallbackRole: "owner",
    });

    expect(keyActor).toBeDefined();
    expect(keyActor?.userId).toBe(sessionActor?.userId);
    expect(keyActor?.organizationId).toBe(sessionActor?.organizationId);
    expect(keyActor?.role).toBe(sessionActor?.role);
    expect(keyActor?.isSystem).toBe(false);
    expect(Array.isArray(keyActor?.permissions)).toBe(true);

    const second = await auth.api.createOrganization({
      body: { name: "Second Org", slug: `second-${Date.now()}` },
      headers: activeHeaders,
    });
    expect(second.id).toBeTruthy();

    await auth.api.createInvitation({
      body: {
        email: `member-${Date.now()}@example.com`,
        role: "member",
        organizationId: second.id,
      },
      headers: activeHeaders,
    });

    const invite = mailers.sent.find((m) => m.kind === "invitation");
    expect(invite).toBeDefined();

    // Two-factor / passkey endpoints are registered (browser ceremony deferred to Phase 8 UI).
    expect(typeof auth.api.enableTwoFactor).toBe("function");
    expect(typeof auth.api.generateBackupCodes).toBe("function");
    expect(typeof auth.handler).toBe("function");

    // Bootstrap platform admin via DB — setRole requires an existing admin session.
    expect(sessionActor?.userId).toBeDefined();
    await db
      .update(user)
      .set({ role: "admin" })
      .where(eq(user.id, sessionActor?.userId ?? ""));

    const targetEmail = `target-${Date.now()}@example.com`;
    await auth.api.signUpEmail({
      body: { email: targetEmail, password, name: "Target User" },
    });
    const targetVerification = mailers.sent.find(
      (m) => m.kind === "verification" && m.to === targetEmail,
    );
    await auth.api.verifyEmail({
      query: { token: targetVerification?.token ?? "" },
    });
    const targetSession = await auth.api.signInEmail({
      body: { email: targetEmail, password },
      returnHeaders: true,
    });
    const targetCookies = cookieHeadersFrom(targetSession.headers);
    const targetSessionData = await auth.api.getSession({ headers: targetCookies });
    const targetUserId = targetSessionData?.user.id;
    expect(targetUserId).toBeTruthy();

    // Fresh session so the elevated `user.role` is loaded.
    const adminSignIn = await auth.api.signInEmail({
      body: { email, password },
      returnHeaders: true,
    });
    const adminCookies = cookieHeadersFrom(adminSignIn.headers);
    const adminSession = await auth.api.getSession({ headers: adminCookies });
    expect(adminSession?.user.role).toBe("admin");

    const impersonation = await auth.api.impersonateUser({
      body: { userId: targetUserId ?? "" },
      headers: adminCookies,
      returnHeaders: true,
    });
    const impCookies = cookieHeadersFrom(impersonation.headers, adminCookies);

    const targetOrgs = await auth.api.listOrganizations({ headers: impCookies });
    const targetPersonal = targetOrgs[0];
    expect(targetPersonal).toBeDefined();
    await auth.api.setActiveOrganization({
      body: { organizationId: targetPersonal?.id },
      headers: impCookies,
    });

    const impActor = await resolveActorFromSession({ auth, headers: impCookies });
    expect(impActor).toBeDefined();
    expect(impActor?.isImpersonating).toBe(true);
    if (impActor === undefined) {
      throw new Error("expected impersonated actor");
    }

    expect(can(impActor, PERMISSIONS["organization:delete"]).allowed).toBe(false);
    expect(can(impActor, PERMISSIONS["apiKey:revoke"]).allowed).toBe(false);
  });
});
