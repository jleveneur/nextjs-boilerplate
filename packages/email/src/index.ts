import { Resend } from "resend";

import { env } from "@repo/env";
import { logger } from "@repo/logger";

import { writeToOutbox } from "./outbox.ts";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

const resend = env.RESEND_API_KEY === undefined ? null : new Resend(env.RESEND_API_KEY);

/**
 * Sends one transactional email.
 *
 * With `RESEND_API_KEY` set, it goes to Resend. Without it, the message is
 * appended to the local outbox and its links are logged, so sign-up,
 * verification, and invitations all work on a fresh clone before anyone has
 * created an account with a provider.
 *
 * Throws on a delivery failure rather than swallowing it: Better Auth calls
 * this from the middle of sign-up, and a verification email that silently
 * vanished leaves a user who can never sign in.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (resend === null) {
    writeToOutbox(outboxDirectory(), { ...input, sentAt: new Date().toISOString() });
    // A warning, not information: nothing was actually delivered. The link is
    // logged because one nobody can see is the same as an email nobody sent.
    logger.warn(
      { to: input.to, subject: input.subject, link: firstLink(input.html) },
      "email not sent: no RESEND_API_KEY, written to the local outbox",
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  if (error) {
    throw new Error(`Could not send "${input.subject}" to ${input.to}: ${error.message}`);
  }
}

/** Where the outbox lives. Playwright points this at a directory it can read. */
export function outboxDirectory(): string {
  return env.MAIL_OUTBOX_DIR ?? ".mail";
}

/**
 * The action link, as a developer can paste it.
 *
 * The templates escape URLs for HTML, so `&` arrives as `&amp;` — pasted from
 * a terminal that produces a broken query string, which makes the whole line
 * useless for the one job it has.
 */
function firstLink(html: string): string {
  const escaped = /href="([^"]+)"/.exec(html)?.[1];
  return escaped === undefined ? "(no link in this message)" : escaped.replaceAll("&amp;", "&");
}

export { invitationEmail, resetPasswordEmail, verificationEmail, type Email } from "./templates.ts";
export { OUTBOX_FILE, parseOutbox, type OutboxEntry } from "./outbox.ts";
