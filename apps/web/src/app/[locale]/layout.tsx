import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/providers.tsx";
import { routing } from "@/i18n/routing.ts";
import { publicUrl } from "@/lib/public-url.ts";

// oxlint-disable-next-line import/no-unassigned-import -- Next.css entry
import "@/styles/globals.css";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const origin = publicUrl();

  return {
    // Without `metadataBase` Next cannot turn a relative asset path into the
    // absolute URL that Open Graph requires, and drops the tag with a warning.
    metadataBase: new URL(origin),
    title: {
      default: t("title"),
      template: `%s · ${t("title")}`,
    },
    description: t("description"),
    // Only what is true for every page in this locale. Canonical, `hreflang` and
    // `og:url` are path-specific and are set per page by `localizedMetadata` —
    // Next merges `alternates` down the tree, so a canonical declared here would
    // make `/fr/sign-in` claim that `/fr` is its canonical URL.
    openGraph: {
      type: "website",
      siteName: t("title"),
      title: t("title"),
      description: t("description"),
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
