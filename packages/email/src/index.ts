// oxlint-disable-next-line import/no-unassigned-import
import "server-only";

export {
  buildInvitationEmail,
  buildMagicLinkEmail,
  buildVerifyEmail,
  buildWelcomeEmail,
  type BuiltEmail,
} from "./emails/build.tsx";
export { InvitationEmail, type InvitationEmailProps } from "./emails/invitation.tsx";
export { MagicLinkEmail, type MagicLinkEmailProps } from "./emails/magic-link.tsx";
export { emailMessages, type EmailMessages } from "./emails/messages.ts";
export { VerifyEmail, type VerifyEmailProps } from "./emails/verify-email.tsx";
export { WelcomeEmail, type WelcomeEmailProps } from "./emails/welcome.tsx";
export { createNoopMailer, type SentEmail } from "./noop-mailer.ts";
export { createResendMailer, type CreateResendMailerOptions } from "./resend-mailer.ts";
export { createSmtpMailer, type CreateSmtpMailerOptions } from "./smtp-mailer.ts";
export type { Mailer, SendEmailInput, SendEmailResult } from "./types.ts";
