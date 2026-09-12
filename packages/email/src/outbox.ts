import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type OutboxEntry = {
  to: string;
  subject: string;
  html: string;
  sentAt: string;
};

export const OUTBOX_FILE = "outbox.jsonl";

/**
 * Where mail goes when there is no Resend key.
 *
 * This is the test seam, not a second transport. A delivered email cannot be
 * read back by a browser test, and a developer who has not signed up for Resend
 * still has to be able to click a verification link. One JSON object per line,
 * appended synchronously so a test that reads the file straight after a request
 * sees a complete record rather than a half-written one.
 */
export function writeToOutbox(directory: string, entry: OutboxEntry): void {
  mkdirSync(directory, { recursive: true });
  appendFileSync(join(directory, OUTBOX_FILE), `${JSON.stringify(entry)}\n`, "utf8");
}

/** Parses outbox contents. Exported so tests read it the same way it is written. */
export function parseOutbox(contents: string): OutboxEntry[] {
  return contents
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line): unknown => JSON.parse(line))
    .filter((value): value is OutboxEntry => isOutboxEntry(value));
}

function isOutboxEntry(value: unknown): value is OutboxEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const entry: Record<string, unknown> = { ...value };
  return typeof entry["to"] === "string" && typeof entry["html"] === "string";
}
