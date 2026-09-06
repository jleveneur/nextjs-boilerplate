import { getTranslations } from "next-intl/server";

import { CardHeader, CardTitle } from "@repo/ui";

import { TwoFactorForm } from "./two-factor-form.tsx";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function TwoFactorPage({ searchParams }: Props) {
  const { next } = await searchParams;
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
