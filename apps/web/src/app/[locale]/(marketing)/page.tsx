import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "../../../i18n/navigation.ts";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function MarketingHomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
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
        <Link
          href="/design-system"
          className="text-primary underline-offset-4 hover:underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          {t("designSystem")}
        </Link>
      </p>
    </main>
  );
}
