/**
 * Ready-to-send descriptors for each transactional email.
 *
 * Two jobs, both of which exist because of where the callers live.
 *
 * **Subject and body stay together.** They are drawn from the same catalog entry
 * here, so a translated body can never ship with an English subject. When the
 * caller assembles the subject itself, that drift is invisible until someone
 * reads their own inbox in the other language.
 *
 * **Composition roots stay `.ts`.** `apps/web`, `apps/api` and `apps/worker`
 * wire these into Better Auth callbacks. Passing the element directly would make
 * every one of those files `.tsx` for the sake of four JSX expressions, so the
 * JSX is kept behind these functions instead.
 *
 * The result spreads straight into `Mailer.send`:
 *
 * ```ts
 * await mailer.send({ to: email, ...buildInvitationEmail({ url, inviterName, organizationName, locale }) });
 * ```
 */

import type { ReactElement } from "react";

import { defaultLocale, type Locale } from "@repo/i18n";

import { InvitationEmail } from "./invitation.tsx";
import { MagicLinkEmail } from "./magic-link.tsx";
import { emailMessages } from "./messages.ts";
import { VerifyEmail } from "./verify-email.tsx";
import { WelcomeEmail } from "./welcome.tsx";

/** Subject line plus body element — the parts of a send that depend on locale. */
export type BuiltEmail = {
  readonly subject: string;
  readonly react: ReactElement;
};

export function buildVerifyEmail(input: {
  readonly url: string;
  readonly locale?: Locale;
}): BuiltEmail {
  const locale = input.locale ?? defaultLocale;

  return {
    subject: emailMessages(locale).verifyEmail.subject,
    react: <VerifyEmail url={input.url} locale={locale} />,
  };
}

export function buildMagicLinkEmail(input: {
  readonly url: string;
  readonly locale?: Locale;
}): BuiltEmail {
  const locale = input.locale ?? defaultLocale;

  return {
    subject: emailMessages(locale).magicLink.subject,
    react: <MagicLinkEmail url={input.url} locale={locale} />,
  };
}

export function buildInvitationEmail(input: {
  readonly url: string;
  readonly inviterName: string;
  readonly organizationName: string;
  readonly locale?: Locale;
}): BuiltEmail {
  const locale = input.locale ?? defaultLocale;

  return {
    subject: emailMessages(locale).invitation.subject({
      organizationName: input.organizationName,
    }),
    react: (
      <InvitationEmail
        url={input.url}
        inviterName={input.inviterName}
        organizationName={input.organizationName}
        locale={locale}
      />
    ),
  };
}

export function buildWelcomeEmail(input: {
  readonly name: string;
  readonly appName?: string;
  readonly locale?: Locale;
}): BuiltEmail {
  const locale = input.locale ?? defaultLocale;
  const appName = input.appName ?? "App";

  return {
    subject: emailMessages(locale).welcome.subject({ appName }),
    react: <WelcomeEmail name={input.name} appName={appName} locale={locale} />,
  };
}
