import { describe, expect, it } from "vitest";

import { WelcomeEmail } from "./emails/welcome.tsx";
import { resolveHtml } from "./render.ts";

describe("resolveHtml", () => {
  it("returns html when provided", async () => {
    await expect(resolveHtml({ to: "a@b.com", subject: "s", html: "<p>x</p>" })).resolves.toBe(
      "<p>x</p>",
    );
  });

  it("renders a react email element", async () => {
    const html = await resolveHtml({
      to: "a@b.com",
      subject: "s",
      react: <WelcomeEmail name="Ada" />,
    });
    expect(html).toContain("Welcome,");
    expect(html).toContain("Ada");
  });

  it("throws when neither react nor html is provided", async () => {
    await expect(resolveHtml({ to: "a@b.com", subject: "s" })).rejects.toThrow(/react or html/);
  });
});
