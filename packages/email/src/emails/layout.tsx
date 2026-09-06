/**
 * Shared shell for every transactional email.
 *
 * Each template was otherwise going to repeat the same `Html`/`Head`/`Body`
 * nesting and the same inline style objects, which is how one email quietly
 * stops matching the others. Only the copy and the call to action differ.
 *
 * Styles are inline objects because that is the only styling mail clients agree
 * on — Gmail strips `<style>` blocks, and Outlook's renderer predates most of
 * CSS. This is not the place to reach for the design system.
 */

import type { ReactNode } from "react";
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from "react-email";

import type { Locale } from "@repo/i18n";

import type { EmailMessages } from "./messages.ts";

export type EmailLayoutProps = {
  /** Sets `<html lang>`, which screen readers use to pick a voice. */
  readonly locale: Locale;
  /** Inbox preview line. Not repeated in the body. */
  readonly preview: string;
  readonly heading: string;
  readonly children: ReactNode;
  /** Optional call to action; omitted for emails that only inform. */
  readonly action?: {
    readonly href: string;
    readonly label: string;
  };
  readonly messages: EmailMessages;
};

export function EmailLayout({
  locale,
  preview,
  heading,
  children,
  action,
  messages,
}: EmailLayoutProps) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
      {/* `Body` defaults its own `lang` to "en" rather than inheriting from
          `Html`, so a French email would otherwise announce itself as English
          to a screen reader reading the body element. */}
      <Body lang={locale} style={body}>
        <Container style={container}>
          <Heading style={headingStyle}>{heading}</Heading>
          {children}
          {action === undefined ? null : (
            <>
              <Button href={action.href} style={button}>
                {action.label}
              </Button>
              {/* A client that strips the button leaves the recipient with no way
                  through, so the raw URL is always present as well. */}
              <Text style={muted}>{messages.common.orCopyLink}</Text>
              <Link href={action.href} style={link}>
                {action.href}
              </Link>
            </>
          )}
          <Text style={muted}>{messages.common.ignore}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f6f6f6",
  fontFamily: "Helvetica, Arial, sans-serif",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  padding: "24px",
  maxWidth: "480px",
};

const headingStyle = {
  fontSize: "22px",
  margin: "0 0 16px",
};

export const text = {
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 24px",
};

const button = {
  backgroundColor: "#111111",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  padding: "12px 20px",
  textDecoration: "none",
};

const link = {
  color: "#555555",
  fontSize: "13px",
  wordBreak: "break-all" as const,
};

const muted = {
  color: "#666666",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "24px 0 8px",
};
