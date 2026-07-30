/**
 * SMTP adapter — local Mailpit and any SMTP relay.
 */

import { createTransport } from "nodemailer";

import { resolveHtml } from "./render.ts";
import type { Mailer } from "./types.ts";

export type CreateSmtpMailerOptions = {
  /** e.g. `smtp://127.0.0.1:55438` */
  smtpUrl: string;
  from: string;
};

export function createSmtpMailer(options: CreateSmtpMailerOptions): Mailer {
  const transport = createTransport(options.smtpUrl);

  return {
    async send(input) {
      const html = await resolveHtml(input);
      const info = await transport.sendMail({
        from: options.from,
        to: input.to,
        subject: input.subject,
        html,
        headers: input.headers,
        replyTo: input.replyTo,
      });

      const id = typeof info.messageId === "string" ? info.messageId : "smtp";
      return { id };
    },
  };
}
