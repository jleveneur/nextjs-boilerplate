import { getTranslations } from "next-intl/server";

import { CardDescription, CardHeader, CardTitle } from "@repo/ui";

import { ContinueToApp } from "@/features/auth/continue-to-app.tsx";
import { requireLocale } from "@/i18n/params.ts";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ContinuePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("Auth");

  return (
    <>
      <CardHeader>
        <CardTitle>{t("continueTitle")}</CardTitle>
        <CardDescription>{t("continuing")}</CardDescription>
      </CardHeader>
      <div className="px-6 pb-6">
        <ContinueToApp locale={requireLocale(locale)} />
      </div>
    </>
  );
}
