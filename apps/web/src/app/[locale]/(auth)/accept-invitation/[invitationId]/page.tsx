import { CardHeader, CardTitle } from "@repo/ui";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AcceptInvitationForm } from "./accept-invitation-form.tsx";

type Props = {
  params: Promise<{ locale: string; invitationId: string }>;
};

export default async function AcceptInvitationPage({ params }: Props) {
  const { locale, invitationId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <>
      <CardHeader>
        <CardTitle>{t("acceptInviteTitle")}</CardTitle>
      </CardHeader>
      <AcceptInvitationForm invitationId={invitationId} />
    </>
  );
}
