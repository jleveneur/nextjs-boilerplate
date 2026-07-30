/**
 * Recording mailer for unit tests — never sends.
 */

import { generateUuidV7 } from "@repo/utils";

import type { Mailer, SendEmailInput, SendEmailResult } from "./types.ts";

export type SentEmail = SendEmailInput & { id: string };

export function createNoopMailer(): Mailer & { sent: SentEmail[] } {
  const sent: SentEmail[] = [];

  return {
    sent,
    send(input) {
      const id = generateUuidV7();
      sent.push({ ...input, id });
      return Promise.resolve({ id } satisfies SendEmailResult);
    },
  };
}
