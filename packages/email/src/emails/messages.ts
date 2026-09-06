/**
 * Copy for the transactional emails, per locale.
 *
 * These catalogs live in this package rather than in an app's `messages/`
 * directory, unlike product UI copy. The rule there — a catalog belongs to the
 * app that renders it — points here too: the templates are rendered by
 * `@repo/email`, and `web`, `api` and `worker` all send the same verification
 * email. A copy per app would be three catalogs to keep in step.
 *
 * ## Why this is not JSON
 *
 * The catalog is a `Record<Locale, EmailMessages>` whose shape is a TypeScript
 * type, so adding a locale to `@repo/i18n` fails to compile until its
 * translations exist, and a renamed key fails at every call site at once.
 * Message files loaded as JSON get neither: a missing key there is a runtime
 * fallback nobody sees until a French user reports an English email.
 *
 * Values that take parameters are functions rather than ICU strings. That keeps
 * the parameter names and types checked by the compiler, and avoids shipping an
 * ICU parser to render four emails. If the copy ever needs plurals or
 * gendered forms, this is the point to reach for a real message formatter.
 */

import type { Locale } from "@repo/i18n";

export type EmailMessages = {
  readonly common: {
    /** Closing line, shown under the call to action in every template. */
    readonly ignore: string;
    /** Fallback shown when a mail client cannot render the button. */
    readonly orCopyLink: string;
  };
  readonly verifyEmail: {
    readonly subject: string;
    readonly preview: string;
    readonly heading: string;
    readonly body: string;
    readonly action: string;
  };
  readonly magicLink: {
    readonly subject: string;
    readonly preview: string;
    readonly heading: string;
    readonly body: string;
    readonly action: string;
  };
  readonly invitation: {
    readonly subject: (input: { organizationName: string }) => string;
    readonly preview: (input: { organizationName: string }) => string;
    readonly heading: (input: { organizationName: string }) => string;
    readonly body: (input: { inviterName: string; organizationName: string }) => string;
    readonly action: string;
  };
  readonly welcome: {
    readonly subject: (input: { appName: string }) => string;
    readonly preview: (input: { appName: string }) => string;
    readonly heading: (input: { name: string }) => string;
    readonly body: string;
  };
};

const en: EmailMessages = {
  common: {
    ignore: "If you did not request this, you can safely ignore this email.",
    orCopyLink: "Or paste this link into your browser:",
  },
  verifyEmail: {
    subject: "Verify your email",
    preview: "Confirm your email address to finish signing up",
    heading: "Verify your email",
    body: "Confirm this address to finish setting up your account.",
    action: "Verify email",
  },
  magicLink: {
    subject: "Your sign-in link",
    preview: "Your single-use link to sign in",
    heading: "Sign in",
    body: "Use the link below to sign in. It works once and expires shortly.",
    action: "Sign in",
  },
  invitation: {
    subject: ({ organizationName }) => `Join ${organizationName}`,
    preview: ({ organizationName }) => `You have been invited to ${organizationName}`,
    heading: ({ organizationName }) => `Join ${organizationName}`,
    body: ({ inviterName, organizationName }) =>
      `${inviterName} invited you to collaborate on ${organizationName}.`,
    action: "Accept invitation",
  },
  welcome: {
    subject: ({ appName }) => `Welcome to ${appName}`,
    preview: ({ appName }) => `Your ${appName} account is ready`,
    heading: ({ name }) => `Welcome, ${name}`,
    body: "Your account is ready. Sign in to get started.",
  },
};

const fr: EmailMessages = {
  common: {
    ignore: "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
    orCopyLink: "Ou collez ce lien dans votre navigateur :",
  },
  verifyEmail: {
    subject: "Vérifiez votre adresse e-mail",
    preview: "Confirmez votre adresse e-mail pour terminer votre inscription",
    heading: "Vérifiez votre adresse e-mail",
    body: "Confirmez cette adresse pour terminer la configuration de votre compte.",
    action: "Vérifier l'adresse",
  },
  magicLink: {
    subject: "Votre lien de connexion",
    preview: "Votre lien à usage unique pour vous connecter",
    heading: "Connexion",
    body: "Utilisez le lien ci-dessous pour vous connecter. Il est à usage unique et expire rapidement.",
    action: "Se connecter",
  },
  invitation: {
    subject: ({ organizationName }) => `Rejoindre ${organizationName}`,
    preview: ({ organizationName }) => `Vous avez été invité à rejoindre ${organizationName}`,
    heading: ({ organizationName }) => `Rejoindre ${organizationName}`,
    body: ({ inviterName, organizationName }) =>
      `${inviterName} vous invite à collaborer sur ${organizationName}.`,
    action: "Accepter l'invitation",
  },
  welcome: {
    subject: ({ appName }) => `Bienvenue sur ${appName}`,
    preview: ({ appName }) => `Votre compte ${appName} est prêt`,
    heading: ({ name }) => `Bienvenue, ${name}`,
    body: "Votre compte est prêt. Connectez-vous pour commencer.",
  },
};

/**
 * Every supported locale, keyed.
 *
 * Typed as `Record<Locale, …>` on purpose: adding a locale to `@repo/i18n`
 * breaks this file until someone writes the translations, which is the whole
 * point. A `Partial` here with a runtime fallback would let a half-translated
 * locale ship silently.
 */
const CATALOGS: Record<Locale, EmailMessages> = { en, fr };

/** Copy for `locale`. Total over the supported locales, so it cannot miss. */
export function emailMessages(locale: Locale): EmailMessages {
  return CATALOGS[locale];
}
