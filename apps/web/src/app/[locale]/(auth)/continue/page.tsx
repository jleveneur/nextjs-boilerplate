import { CardDescription, CardHeader, CardTitle } from "@repo/ui";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ContinueToApp } from "../../../../features/auth/continue-to-app.tsx";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ContinuePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <>
      <CardHeader>
        <CardTitle>{t("continueTitle")}</CardTitle>
        <CardDescription>{t("continuing")}</CardDescription>
      </CardHeader>
      <div className="px-6 pb-6">
        <ContinueToApp />
      </div>
    </>
  );
}
