/**
 * Transactional email bodies.
 *
 * Plain functions returning HTML, not React Email: three emails do not justify
 * a renderer, a component library, and a preview server. Swap them for
 * components when the design outgrows this — the call sites only need
 * `{ subject, html }`.
 */

export type Email = {
  subject: string;
  html: string;
};

/**
 * Escapes text before it goes into the HTML body.
 *
 * Names and organization names are user input, and an email is just a document
 * someone else renders — the same rules apply.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function layout(heading: string, body: string, action: { url: string; label: string }): string {
  return [
    `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111">`,
    `<h1 style="font-size:20px;font-weight:600;margin:0 0 16px">${heading}</h1>`,
    `<p style="font-size:14px;line-height:1.6;margin:0 0 24px">${body}</p>`,
    `<p style="margin:0 0 24px"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px">${action.label}</a></p>`,
    `<p style="font-size:12px;line-height:1.6;color:#666;margin:0">If the button does not work, paste this into your browser:<br>${escapeHtml(action.url)}</p>`,
    `</div>`,
  ].join("");
}

export function verificationEmail(input: { name: string; url: string }): Email {
  return {
    subject: "Confirm your email address",
    html: layout(
      "Confirm your email address",
      `Hi ${escapeHtml(input.name)}, confirm this address to finish setting up your account.`,
      { url: input.url, label: "Confirm email" },
    ),
  };
}

export function resetPasswordEmail(input: { name: string; url: string }): Email {
  return {
    subject: "Reset your password",
    html: layout(
      "Reset your password",
      `Hi ${escapeHtml(input.name)}, use the link below to choose a new password. If you did not ask for this, you can ignore this email.`,
      { url: input.url, label: "Reset password" },
    ),
  };
}

export function invitationEmail(input: {
  organizationName: string;
  inviterName: string;
  url: string;
}): Email {
  return {
    subject: `Join ${input.organizationName}`,
    html: layout(
      `Join ${escapeHtml(input.organizationName)}`,
      `${escapeHtml(input.inviterName)} invited you to join ${escapeHtml(input.organizationName)}.`,
      { url: input.url, label: "Accept invitation" },
    ),
  };
}
