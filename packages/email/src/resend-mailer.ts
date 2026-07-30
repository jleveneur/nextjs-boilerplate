/**
 * Resend adapter for deployed environments.
 */

import { Resend } from "resend";

import { resolveHtml } from "./render.ts";
import type { Mailer } from "./types.ts";

export type CreateResendMailerOptions = {
  apiKey: string;
  from: string;
};

export function createResendMailer(options: CreateResendMailerOptions): Mailer {
  const client = new Resend(options.apiKey);

  return {
    async send(input) {
      const html = await resolveHtml(input);
      const result = await client.emails.send({
        from: options.from,
        to: input.to,
        subject: input.subject,
        html,
        ...(input.headers === undefined ? {} : { headers: input.headers }),
        ...(input.replyTo === undefined ? {} : { replyTo: input.replyTo }),
      });

      if (result.error !== null && result.error !== undefined) {
        throw new Error(result.error.message);
      }

      const id = result.data?.id;
      if (id === undefined) {
        throw new Error("Resend returned no message id");
      }

      return { id };
    },
  };
}
