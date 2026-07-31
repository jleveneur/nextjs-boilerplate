import { CardDescription, CardHeader, CardTitle } from "@repo/ui";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { VerifyEmailClient } from "./verify-email-client.tsx";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <>
      <CardHeader>
        <CardTitle>{t("verifyEmailTitle")}</CardTitle>
        <CardDescription>{t("verifyEmailBody")}</CardDescription>
      </CardHeader>
      <VerifyEmailClient token={token} />
    </>
  );
}
