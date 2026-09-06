import { Text } from "react-email";

import { defaultLocale, type Locale } from "@repo/i18n";

import { EmailLayout, text } from "./layout.tsx";
import { emailMessages } from "./messages.ts";

export type WelcomeEmailProps = {
  readonly name: string;
  readonly appName?: string;
  readonly locale?: Locale;
};

export function WelcomeEmail({ name, appName = "App", locale = defaultLocale }: WelcomeEmailProps) {
  const messages = emailMessages(locale);

  return (
    <EmailLayout
      locale={locale}
      preview={messages.welcome.preview({ appName })}
      heading={messages.welcome.heading({ name })}
      messages={messages}
    >
      <Text style={text}>{messages.welcome.body}</Text>
    </EmailLayout>
  );
}

export default WelcomeEmail;
