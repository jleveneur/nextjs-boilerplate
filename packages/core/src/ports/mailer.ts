/**
 * Email send port.
 *
 * Defined here (not imported from `@repo/email`) so core stays free of React
 * Email types. Composition roots adapt `@repo/email` to this shape.
 */

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  headers?: Record<string, string>;
  replyTo?: string;
};

export type SendEmailResult = {
  id: string;
};

export type Mailer = {
  send(input: SendEmailInput): Promise<SendEmailResult>;
};

/** Adapt a React-capable mailer to core's HTML-only mailer port. */
export function adaptEmailMailer(mailer: Mailer): Mailer {
  return {
    async send(input) {
      return mailer.send({
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.headers === undefined ? {} : { headers: input.headers }),
        ...(input.replyTo === undefined ? {} : { replyTo: input.replyTo }),
      });
    },
  };
}
