/* Sequential Mailpit polling — await-in-loop is intentional. */
/* eslint-disable eslint/no-await-in-loop -- polling */

const mailpitApi = process.env["MAILPIT_API_URL"] ?? "http://127.0.0.1:55442";

type MailpitMessage = {
  ID: string;
  To: { Address: string }[];
  Subject: string;
};

type MailpitMessageDetail = {
  ID: string;
  Text: string;
  HTML: string;
};

/** Poll Mailpit until a matching message appears (sequential by design). */
export async function waitForMailTo(
  email: string,
  subjectIncludes?: string,
): Promise<MailpitMessageDetail> {
  const deadline = Date.now() + 30_000;
  // oxlint-disable-next-line eslint/no-await-in-loop -- polling until the message lands
  while (Date.now() < deadline) {
    const listResponse = await fetch(`${mailpitApi}/api/v1/messages`);
    if (!listResponse.ok) {
      throw new Error(`Mailpit list failed: ${listResponse.status}`);
    }
    const list = (await listResponse.json()) as { messages: MailpitMessage[] };
    const match = list.messages.find((message) => {
      const toMatch = message.To.some((to) => to.Address.toLowerCase() === email.toLowerCase());
      if (!toMatch) return false;
      if (subjectIncludes === undefined) return true;
      return message.Subject.toLowerCase().includes(subjectIncludes.toLowerCase());
    });
    if (match !== undefined) {
      const detailResponse = await fetch(`${mailpitApi}/api/v1/message/${match.ID}`);
      if (!detailResponse.ok) {
        throw new Error(`Mailpit message failed: ${detailResponse.status}`);
      }
      return (await detailResponse.json()) as MailpitMessageDetail;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  }
  throw new Error(`Timed out waiting for mail to ${email}`);
}

export function extractFirstHttpUrl(content: string): string {
  const match = content.match(/https?:\/\/[^\s"'<>]+/);
  if (match === null || match[0] === undefined) {
    throw new Error("No URL found in email body");
  }
  return match[0].replace(/&amp;/g, "&");
}
