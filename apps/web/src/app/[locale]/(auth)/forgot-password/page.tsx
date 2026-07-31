import { CardHeader, CardTitle } from "@repo/ui";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ForgotPasswordForm } from "./forgot-password-form.tsx";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <>
      <CardHeader>
        <CardTitle>{t("forgotTitle")}</CardTitle>
      </CardHeader>
      <ForgotPasswordForm />
    </>
  );
}
