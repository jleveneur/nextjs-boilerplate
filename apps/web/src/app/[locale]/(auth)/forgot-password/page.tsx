import { getTranslations } from "next-intl/server";

import { CardHeader, CardTitle } from "@repo/ui";

import { ForgotPasswordForm } from "./forgot-password-form.tsx";

export default async function ForgotPasswordPage() {
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
