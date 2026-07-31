"use client";

import { Button, CardContent } from "@repo/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { authErrorMessage } from "../../../../../features/auth/auth-utils.ts";
import { Link, useRouter } from "../../../../../i18n/navigation.ts";
import { authClient } from "../../../../../lib/auth-client.ts";

type Props = {
  invitationId: string;
};

export function AcceptInvitationForm({ invitationId }: Props) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function accept() {
    setError(null);
    setPending(true);
    const { error: resultError } = await authClient.organization.acceptInvitation({
      invitationId,
    });
    setPending(false);

    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <CardContent className="flex flex-col gap-3">
      <Button
        type="button"
        className="w-full"
        disabled={pending}
        onClick={() => {
          void accept();
        }}
      >
        {t("acceptInviteSubmit")}
      </Button>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Link href="/sign-in" className="text-sm underline-offset-4 hover:underline">
        {t("backToSignIn")}
      </Link>
    </CardContent>
  );
}
