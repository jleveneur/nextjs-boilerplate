import { Text } from "react-email";

import { defaultLocale, type Locale } from "@repo/i18n";

import { EmailLayout, text } from "./layout.tsx";
import { emailMessages } from "./messages.ts";

export type InvitationEmailProps = {
  /** Accept link, scoped to the invitation id. */
  readonly url: string;
  /** Display name of the member who sent the invitation. Free text. */
  readonly inviterName: string;
  /** Organization being joined. Free text. */
  readonly organizationName: string;
  readonly locale?: Locale;
};

export function InvitationEmail({
  url,
  inviterName,
  organizationName,
  locale = defaultLocale,
}: InvitationEmailProps) {
  const messages = emailMessages(locale);

  return (
    <EmailLayout
      locale={locale}
      preview={messages.invitation.preview({ organizationName })}
      heading={messages.invitation.heading({ organizationName })}
      action={{ href: url, label: messages.invitation.action }}
      messages={messages}
    >
      {/* `inviterName` and `organizationName` are free text chosen by the sender.
          They are safe here because JSX escapes interpolated children — that is
          precisely the property the old string-built body did not have. */}
      <Text style={text}>{messages.invitation.body({ inviterName, organizationName })}</Text>
    </EmailLayout>
  );
}

export default InvitationEmail;
