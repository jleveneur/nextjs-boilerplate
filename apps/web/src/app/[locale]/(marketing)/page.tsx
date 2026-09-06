import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { defaultLocale, isLocale } from "@repo/i18n";

import { Link } from "@/i18n/navigation.ts";
import { localizedMetadata } from "@/lib/seo.ts";

/**
 * Canonical and `hreflang` for this page.
 *
 * Declared here rather than inherited from the locale layout: Next merges
 * `alternates` down the tree, so a canonical set once at the top would make
 * every page claim the locale root as its canonical URL.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return localizedMetadata(isLocale(locale) ? locale : defaultLocale, "");
}

export default async function MarketingHomePage() {
  const t = await getTranslations("Marketing");

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t("headline")}</h1>
      <p className="text-muted-foreground max-w-prose text-base">{t("body")}</p>
      <p className="flex flex-wrap gap-4">
        <Link
          href="/sign-in"
          className="text-primary underline-offset-4 hover:underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          {t("signIn")}
        </Link>
        <Link
          href="/sign-up"
          className="text-primary underline-offset-4 hover:underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          {t("signUp")}
        </Link>
      </p>
    </main>
  );
}
