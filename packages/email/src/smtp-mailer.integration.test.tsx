import { describe, expect, it } from "vitest";

import { WelcomeEmail } from "./emails/welcome.tsx";
import { createSmtpMailer } from "./smtp-mailer.ts";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is required for @repo/email integration tests`);
  }

  return value;
}

describe("createSmtpMailer (mailpit)", () => {
  it("delivers a welcome email that Mailpit receives", async () => {
    const smtpUrl = requireEnv("SMTP_URL");
    const mailpitApi = requireEnv("MAILPIT_API_URL");
    const to = `user-${Date.now()}@example.com`;

    const mailer = createSmtpMailer({
      smtpUrl,
      from: "noreply@example.com",
    });

    await mailer.send({
      to,
      subject: "Welcome integration",
      react: <WelcomeEmail name="Ada" appName="Boilerplate" />,
    });

    // Mailpit search API — wait briefly for async ingest.
    let found = false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await fetch(`${mailpitApi}/api/v1/search?query=to:${to}`);
      expect(response.ok).toBe(true);
      const body = (await response.json()) as { messages?: Array<{ Subject?: string }> };
      if ((body.messages ?? []).some((message) => message.Subject === "Welcome integration")) {
        found = true;
        break;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
    }

    expect(found).toBe(true);
  });
});
