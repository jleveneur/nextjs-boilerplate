import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { defaultLocale, isLocale } from "@repo/i18n";
import { CardHeader, CardTitle } from "@repo/ui";

import { localizedMetadata } from "@/lib/seo.ts";

import { SignUpForm } from "./sign-up-form.tsx";

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
  return localizedMetadata(isLocale(locale) ? locale : defaultLocale, "/sign-up");
}

export default async function SignUpPage() {
  const t = await getTranslations("Auth");

  return (
    <>
      <CardHeader>
        <CardTitle>{t("signUpTitle")}</CardTitle>
      </CardHeader>
      <SignUpForm />
    </>
  );
}
