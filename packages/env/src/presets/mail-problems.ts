/**
 * Email delivery pairing.
 *
 * Apps compose `resend` and `smtp` together. Either channel is enough;
 * composition roots prefer SMTP when `SMTP_URL` is set. A process with neither
 * would otherwise boot and fail on the first send.
 */
export function mailProblems(env: Readonly<Record<string, unknown>>): string[] {
  const hasSmtp = Object.hasOwn(env, "SMTP_URL");
  const hasResend = Object.hasOwn(env, "RESEND_API_KEY");
  if (!hasSmtp && !hasResend) return [];

  const smtpSet = env["SMTP_URL"] !== undefined;
  const resendSet = env["RESEND_API_KEY"] !== undefined;

  if (hasSmtp && hasResend) {
    if (!smtpSet && !resendSet) {
      return ["RESEND_API_KEY: set RESEND_API_KEY or SMTP_URL"];
    }
    return [];
  }

  if (hasResend && !resendSet) {
    return ["RESEND_API_KEY: required"];
  }

  if (hasSmtp && !smtpSet) {
    return ["SMTP_URL: required"];
  }

  return [];
}
