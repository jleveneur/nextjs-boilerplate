import { getTranslations } from "next-intl/server";

import { CardDescription, CardHeader, CardTitle } from "@repo/ui";

import { VerifyEmailClient } from "./verify-email-client.tsx";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;
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
