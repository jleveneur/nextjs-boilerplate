import type { Mailer, SendEmailInput, SendEmailResult } from "../ports/mailer.ts";

export type InMemoryMailer = Mailer & {
  readonly sent: readonly SendEmailInput[];
  clear(): void;
};

export function createInMemoryMailer(): InMemoryMailer {
  const sent: SendEmailInput[] = [];
  let seq = 0;

  return {
    get sent() {
      return sent;
    },
    clear() {
      sent.length = 0;
    },
    send(input: SendEmailInput): Promise<SendEmailResult> {
      sent.push(input);
      seq += 1;
      return Promise.resolve({ id: `mem-email-${seq}` });
    },
  };
}
