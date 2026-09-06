import { getTranslations } from "next-intl/server";

import { CardHeader, CardTitle } from "@repo/ui";

import { ResetPasswordForm } from "./reset-password-form.tsx";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
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
