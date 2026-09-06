import { Text } from "react-email";

import { defaultLocale, type Locale } from "@repo/i18n";

import { EmailLayout, text } from "./layout.tsx";
import { emailMessages } from "./messages.ts";

export type MagicLinkEmailProps = {
  /** Single-use sign-in link. */
  readonly url: string;
  readonly locale?: Locale;
};

export function MagicLinkEmail({ url, locale = defaultLocale }: MagicLinkEmailProps) {
  const messages = emailMessages(locale);

  return (
    <EmailLayout
      locale={locale}
      preview={messages.magicLink.preview}
      heading={messages.magicLink.heading}
      action={{ href: url, label: messages.magicLink.action }}
      messages={messages}
    >
      <Text style={text}>{messages.magicLink.body}</Text>
    </EmailLayout>
  );
}

export default MagicLinkEmail;
