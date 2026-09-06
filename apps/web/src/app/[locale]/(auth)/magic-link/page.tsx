import { getTranslations } from "next-intl/server";

import { CardHeader, CardTitle } from "@repo/ui";

import { MagicLinkForm } from "./magic-link-form.tsx";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function MagicLinkPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const t = await getTranslations("Auth");

  return (
    <>
      <CardHeader>
        <CardTitle>{t("magicLinkTitle")}</CardTitle>
      </CardHeader>
      <MagicLinkForm nextPath={next} />
    </>
  );
}
