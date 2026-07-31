"use client";

import { Button, CardContent } from "@repo/ui";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { authErrorMessage, getPostAuthHref } from "../../../../features/auth/auth-utils.ts";
import { Link, useRouter } from "../../../../i18n/navigation.ts";
import { authClient } from "../../../../lib/auth-client.ts";

type Props = {
  nextPath?: string | undefined;
};

export function PasskeyActions({ nextPath }: Props) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"register" | "authenticate" | null>(null);

  async function registerPasskey() {
    setError(null);
    setPending("register");
    const { error: resultError } = await authClient.passkey.addPasskey({});
    setPending(null);
    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
    }
  }

  async function authenticatePasskey() {
    setError(null);
    setPending("authenticate");
    const { error: resultError } = await authClient.signIn.passkey({});
    setPending(null);
    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      return;
    }
    router.push(getPostAuthHref(nextPath, locale));
    router.refresh();
  }

  return (
    <CardContent className="flex flex-col gap-3">
      <Button
        type="button"
        className="w-full"
        disabled={pending !== null}
        onClick={() => {
          void authenticatePasskey();
        }}
      >
        {t("passkeyAuthenticate")}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending !== null}
        onClick={() => {
          void registerPasskey();
        }}
      >
        {t("passkeyRegister")}
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
