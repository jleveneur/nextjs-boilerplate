import { getTranslations } from "next-intl/server";

import { CardHeader, CardTitle } from "@repo/ui";

import { AcceptInvitationForm } from "./accept-invitation-form.tsx";

type Props = {
  params: Promise<{ invitationId: string }>;
};

export default async function AcceptInvitationPage({ params }: Props) {
  const { invitationId } = await params;
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
