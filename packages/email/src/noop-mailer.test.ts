import { describe, expect, it } from "vitest";

import { createNoopMailer } from "./noop-mailer.ts";

describe("createNoopMailer", () => {
  it("records sends without delivering", async () => {
    const mailer = createNoopMailer();
    const result = await mailer.send({
      to: "user@example.com",
      subject: "Hello",
      html: "<p>Hi</p>",
    });

    expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.subject).toBe("Hello");
  });
});
