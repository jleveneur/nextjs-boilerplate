import { getTranslations } from "next-intl/server";

import { CardHeader, CardTitle } from "@repo/ui";

import { SignInForm } from "./sign-in-form.tsx";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const t = await getTranslations("Auth");

  return (
    <>
      <CardHeader>
        <CardTitle>{t("signInTitle")}</CardTitle>
      </CardHeader>
      <SignInForm nextPath={next} />
    </>
  );
}
