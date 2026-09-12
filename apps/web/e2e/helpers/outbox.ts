import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect } from "@playwright/test";

import { OUTBOX_FILE, parseOutbox, type OutboxEntry } from "@repo/email";

import { E2E } from "../../playwright.config.ts";

/**
 * Reads the mail the app would have sent.
 *
 * A delivered email cannot be opened by a browser test, so with no Resend key
 * the app appends every message to a file instead. This is the only thing in
 * the suite that knows about that; the specs just ask for a link.
 */
export function readOutbox(): OutboxEntry[] {
  try {
    return parseOutbox(readFileSync(join(E2E.outboxDirectory, OUTBOX_FILE), "utf8"));
  } catch {
    // Nothing sent yet — the file is created on the first message.
    return [];
  }
}

/**
 * Waits for a message to `email` whose subject matches, and returns its link.
 *
 * Polls rather than reading once: the request that triggers the email returns
 * before the server has finished writing it.
 */
export async function waitForEmailLink(email: string, subject: RegExp): Promise<string> {
  let found: OutboxEntry | undefined;

  await expect
    .poll(
      () => {
        found = readOutbox()
          .filter((entry) => entry.to === email && subject.test(entry.subject))
          .at(-1);
        return found !== undefined;
      },
      { timeout: 15_000, message: `No email to ${email} matching ${String(subject)}` },
    )
    .toBe(true);

  const link = /href="([^"]+)"/.exec(found?.html ?? "")?.[1];

  if (link === undefined) {
    throw new Error(`Email to ${email} had no link`);
  }

  // The templates escape the URL for HTML; undo that to get a usable address.
  return link.replaceAll("&amp;", "&");
}
