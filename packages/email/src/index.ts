// oxlint-disable-next-line import/no-unassigned-import
import "server-only";

export { WelcomeEmail, type WelcomeEmailProps } from "./emails/welcome.tsx";
export { createNoopMailer, type SentEmail } from "./noop-mailer.ts";
export { createResendMailer, type CreateResendMailerOptions } from "./resend-mailer.ts";
export { createSmtpMailer, type CreateSmtpMailerOptions } from "./smtp-mailer.ts";
export type { Mailer, SendEmailInput, SendEmailResult } from "./types.ts";
