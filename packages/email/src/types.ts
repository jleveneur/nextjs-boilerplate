import type { ReactElement } from "react";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  /** Prefer React Email elements; `html` is an escape hatch. */
  react?: ReactElement;
  html?: string;
  headers?: Record<string, string>;
  replyTo?: string;
};

export type SendEmailResult = {
  id: string;
};

/**
 * Mailer port. `@repo/kernel` adapts this into its own `Mailer` port.
 */
export type Mailer = {
  send(input: SendEmailInput): Promise<SendEmailResult>;
};
