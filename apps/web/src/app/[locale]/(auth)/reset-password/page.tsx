import { CardHeader, CardTitle } from "@repo/ui";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ResetPasswordForm } from "./reset-password-form.tsx";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <>
      <CardHeader>
        <CardTitle>{t("resetTitle")}</CardTitle>
      </CardHeader>
      <ResetPasswordForm token={token} />
    </>
  );
}
