import { describe, expect, it } from "vitest";

import { locales } from "@repo/i18n";

import { resolveHtml } from "../render.ts";
import {
  buildInvitationEmail,
  buildMagicLinkEmail,
  buildVerifyEmail,
  buildWelcomeEmail,
} from "./build.tsx";
import { emailMessages } from "./messages.ts";

const URL_UNDER_TEST = "https://app.example/accept?token=abc&next=%2Fdash";

/** Render a built email the way a mailer would, so the assertions see real HTML. */
async function html(built: { subject: string; react: React.ReactElement }): Promise<string> {
  return resolveHtml({ to: "recipient@example.com", subject: built.subject, react: built.react });
}

/**
 * Rendered HTML with entities decoded, for assertions about copy.
 *
 * React escapes apostrophes to `&#x27;`, so "Si vous n'êtes pas" never appears
 * literally in the output. Tests that care about *escaping* use {@link html} and
 * read the raw entities; tests that care about *wording* use this.
 */
async function copy(built: { subject: string; react: React.ReactElement }): Promise<string> {
  return (await html(built))
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

describe("transactional email builders", () => {
  it("takes the subject from the same catalog entry as the body", () => {
    // Subject and body are built together precisely so a translated body cannot
    // ship under an English subject. Asserted per locale rather than trusted.
    for (const locale of locales) {
      const messages = emailMessages(locale);
      expect(buildVerifyEmail({ url: URL_UNDER_TEST, locale }).subject).toBe(
        messages.verifyEmail.subject,
      );
      expect(buildMagicLinkEmail({ url: URL_UNDER_TEST, locale }).subject).toBe(
        messages.magicLink.subject,
      );
      expect(
        buildInvitationEmail({
          url: URL_UNDER_TEST,
          inviterName: "Ada",
          organizationName: "Acme",
          locale,
        }).subject,
      ).toBe(messages.invitation.subject({ organizationName: "Acme" }));
    }
  });

  it("renders French copy for the French locale", async () => {
    const built = buildVerifyEmail({ url: URL_UNDER_TEST, locale: "fr" });
    const body = await copy(built);

    expect(built.subject).toBe("Vérifiez votre adresse e-mail");
    expect(body).toContain("Confirmez cette adresse");
    // The English string must be absent, not merely outnumbered — a template that
    // renders both languages passes a naive `toContain` check.
    expect(body).not.toContain("Confirm this address");
  });

  it("sets lang on both html and body so screen readers pick the right voice", async () => {
    // react-email's `Body` defaults to `lang="en"` instead of inheriting, so
    // asserting only on `<html>` would pass while the body still claimed English.
    const french = await html(buildVerifyEmail({ url: URL_UNDER_TEST, locale: "fr" }));
    expect(french).toContain('<html dir="ltr" lang="fr">');
    expect(french).not.toContain('lang="en"');

    const english = await html(buildVerifyEmail({ url: URL_UNDER_TEST, locale: "en" }));
    expect(english).toContain('<html dir="ltr" lang="en">');
    expect(english).not.toContain('lang="fr"');
  });

  it("falls back to the default locale when none is given", async () => {
    // Better Auth omits the request for server-initiated sends, so callers can
    // legitimately have no locale to pass.
    const built = buildMagicLinkEmail({ url: URL_UNDER_TEST });
    expect(built.subject).toBe("Your sign-in link");
    expect(await html(built)).toContain('lang="en"');
  });

  it("escapes a display name that contains markup", async () => {
    // The regression that motivated moving off string-built bodies. JSX escapes
    // interpolated children, so the tag arrives as text rather than as a link.
    const body = await html(
      buildInvitationEmail({
        url: URL_UNDER_TEST,
        inviterName: '<a href="https://phish.example">Support</a>',
        organizationName: "Acme",
      }),
    );

    // The URL still appears — as escaped text the recipient can read, which is the
    // point. What must not exist is an anchor pointing at it, so the assertion is
    // on the attribute rather than on the bare substring.
    expect(body).not.toContain('href="https://phish.example"');
    expect(body).toContain("&lt;a href=&quot;https://phish.example&quot;&gt;");
  });

  it("keeps the action URL usable in the href and as copyable text", async () => {
    // A client that strips the button must still leave a way through, so the raw
    // URL is rendered as well. Both copies are entity-escaped by React.
    const body = await html(buildVerifyEmail({ url: URL_UNDER_TEST, locale: "en" }));
    const escaped = "https://app.example/accept?token=abc&amp;next=%2Fdash";

    expect(body).toContain(`href="${escaped}"`);
    expect(body).toContain(`>${escaped}<`);
  });

  it("renders every template in every locale without throwing", async () => {
    // Cheap guard against a catalog entry that exists but is the wrong shape —
    // calling a parameterised message as a plain string throws at render time.
    for (const locale of locales) {
      const built = [
        buildVerifyEmail({ url: URL_UNDER_TEST, locale }),
        buildMagicLinkEmail({ url: URL_UNDER_TEST, locale }),
        buildInvitationEmail({
          url: URL_UNDER_TEST,
          inviterName: "Ada",
          organizationName: "Acme",
          locale,
        }),
        buildWelcomeEmail({ name: "Ada", appName: "Acme", locale }),
      ];

      const bodies = await Promise.all(built.map(copy));

      for (const [index, body] of bodies.entries()) {
        expect(built[index]?.subject.length).toBeGreaterThan(0);
        expect(body).toContain("<html");
        // The closing line is in every template and is locale-specific, so its
        // presence proves the catalog was consulted rather than defaulted.
        expect(body).toContain(emailMessages(locale).common.ignore);
      }
    }
  });
});
