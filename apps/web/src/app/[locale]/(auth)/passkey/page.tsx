import { getTranslations } from "next-intl/server";

import { CardHeader, CardTitle } from "@repo/ui";

import { PasskeyActions } from "./passkey-actions.tsx";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function PasskeyPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const t = await getTranslations("Auth");

  return (
    <>
      <CardHeader>
        <CardTitle>{t("passkeyTitle")}</CardTitle>
      </CardHeader>
      <PasskeyActions nextPath={next} />
    </>
  );
}
