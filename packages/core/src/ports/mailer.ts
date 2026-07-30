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
