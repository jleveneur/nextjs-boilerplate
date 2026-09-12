import { Resend } from "resend";

import { env } from "@repo/env";

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
    // printed because one nobody can see is the same as an email nobody sent.
    console.warn(
      `[email] not sent (no RESEND_API_KEY): "${input.subject}" to ${input.to}\n[email] ${firstLink(input.html)}`,
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

function firstLink(html: string): string {
  return /href="([^"]+)"/.exec(html)?.[1] ?? "(no link in this message)";
}

export { invitationEmail, resetPasswordEmail, verificationEmail, type Email } from "./templates.ts";
export { OUTBOX_FILE, parseOutbox, type OutboxEntry } from "./outbox.ts";
