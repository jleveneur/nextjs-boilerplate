import { CardHeader, CardTitle } from "@repo/ui";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SignUpForm } from "./sign-up-form.tsx";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SignUpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
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
