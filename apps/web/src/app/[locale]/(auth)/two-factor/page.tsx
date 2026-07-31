import { CardHeader, CardTitle } from "@repo/ui";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { TwoFactorForm } from "./two-factor-form.tsx";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
};

export default async function TwoFactorPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { next } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <>
      <CardHeader>
        <CardTitle>{t("twoFactorTitle")}</CardTitle>
      </CardHeader>
      <TwoFactorForm nextPath={next} />
    </>
  );
}
