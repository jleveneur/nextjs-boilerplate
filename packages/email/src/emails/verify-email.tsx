import { Text } from "react-email";

import { defaultLocale, type Locale } from "@repo/i18n";

import { EmailLayout, text } from "./layout.tsx";
import { emailMessages } from "./messages.ts";

export type VerifyEmailProps = {
  /** Verification link. Single-use and short-lived; Better Auth builds it. */
  readonly url: string;
  readonly locale?: Locale;
};

export function VerifyEmail({ url, locale = defaultLocale }: VerifyEmailProps) {
  const messages = emailMessages(locale);

  return (
    <EmailLayout
      locale={locale}
      preview={messages.verifyEmail.preview}
      heading={messages.verifyEmail.heading}
      action={{ href: url, label: messages.verifyEmail.action }}
      messages={messages}
    >
      <Text style={text}>{messages.verifyEmail.body}</Text>
    </EmailLayout>
  );
}

export default VerifyEmail;
