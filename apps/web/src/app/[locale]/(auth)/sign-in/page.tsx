import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { defaultLocale, isLocale } from "@repo/i18n";
import { CardHeader, CardTitle } from "@repo/ui";

import { localizedMetadata } from "@/lib/seo.ts";

import { SignInForm } from "./sign-in-form.tsx";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

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
  return localizedMetadata(isLocale(locale) ? locale : defaultLocale, "/sign-in");
}

export default async function SignInPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const t = await getTranslations("Auth");

  return (
    <>
      <CardHeader>
        <CardTitle>{t("signInTitle")}</CardTitle>
      </CardHeader>
      <SignInForm nextPath={next} />
    </>
  );
}
