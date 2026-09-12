import { describe, expect, it } from "vitest"

import { parseOutbox } from "./outbox.ts"
import { escapeHtml, invitationEmail, resetPasswordEmail, verificationEmail } from "./templates.ts"

const URL_UNDER_TEST = "https://app.example.com/api/auth/verify-email?token=abc123"

describe("templates", () => {
  it("puts the action link in the body twice — button and fallback", () => {
    const { html } = verificationEmail({ name: "Ada", url: URL_UNDER_TEST })

    expect(html.split(URL_UNDER_TEST.replaceAll("&", "&amp;"))).toHaveLength(3)
  })

  it("names the subject after the organization being joined", () => {
    const { subject } = invitationEmail({
      organizationName: "Acme",
      inviterName: "Ada",
      url: URL_UNDER_TEST,
    })

    expect(subject).toBe("Join Acme")
  })

  it("escapes interpolated names", () => {
    const { html } = invitationEmail({
      organizationName: "<script>alert(1)</script>",
      inviterName: "Ada & Co",
      url: URL_UNDER_TEST,
    })

    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
    expect(html).toContain("Ada &amp; Co")
  })

  it("escapes the query string so a token cannot break out of the attribute", () => {
    const { html } = resetPasswordEmail({
      name: "Ada",
      url: 'https://app.example.com/r?t=x"><script>alert(1)</script>',
    })

    expect(html).not.toContain("<script>")
  })
})

describe("escapeHtml", () => {
  it("leaves ordinary text alone", () => {
    expect(escapeHtml("Ada Lovelace")).toBe("Ada Lovelace")
  })

  it("escapes every character that changes parsing", () => {
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;")
  })
})

describe("escaping round-trip", () => {
  // The logged link and the link a browser follows must be the same URL.
  it("unescapes back to the original when a link is read out of the HTML", () => {
    const { html } = verificationEmail({ name: "Ada", url: URL_UNDER_TEST })
    const extracted = /href="([^"]+)"/.exec(html)?.[1]?.replaceAll("&amp;", "&")

    expect(extracted).toBe(URL_UNDER_TEST)
  })
})

describe("parseOutbox", () => {
  it("reads one entry per line and ignores blanks", () => {
    const entries = parseOutbox(
      `{"to":"a@example.test","subject":"One","html":"<a href=\\"x\\">x</a>","sentAt":"2026-01-01T00:00:00.000Z"}\n\n{"to":"b@example.test","subject":"Two","html":"","sentAt":"2026-01-01T00:00:01.000Z"}\n`,
    )

    expect(entries.map((entry) => entry.to)).toStrictEqual(["a@example.test", "b@example.test"])
  })
})
