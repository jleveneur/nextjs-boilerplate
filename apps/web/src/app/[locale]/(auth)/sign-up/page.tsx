import { getTranslations } from "next-intl/server";

import { CardHeader, CardTitle } from "@repo/ui";

import { SignUpForm } from "./sign-up-form.tsx";

export default async function SignUpPage() {
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
