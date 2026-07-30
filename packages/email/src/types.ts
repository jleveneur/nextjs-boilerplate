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
 * Mailer port. Lives here until `@repo/core` re-exports it in Phase 6.
 */
export type Mailer = {
  send(input: SendEmailInput): Promise<SendEmailResult>;
};
