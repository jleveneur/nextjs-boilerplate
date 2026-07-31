"use client";

import { Button, Separator } from "@repo/ui";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { authClient } from "../../lib/auth-client.ts";
import { authErrorMessage, getPostAuthCallbackURL } from "./auth-utils.ts";

type Props = {
  nextPath?: string | undefined;
};

export function OAuthButtons({ nextPath }: Props) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"github" | "google" | "passkey" | null>(null);

  const callbackURL = getPostAuthCallbackURL(nextPath, locale);

  async function signInSocial(provider: "github" | "google") {
    setError(null);
    setPending(provider);
    const { error: resultError } = await authClient.signIn.social({
      provider,
      callbackURL,
    });
    setPending(null);
    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
    }
  }

  async function signInPasskey() {
    setError(null);
    setPending("passkey");
    const { error: resultError } = await authClient.signIn.passkey({});
    setPending(null);
    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      return;
    }
    window.location.assign(callbackURL);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">{t("orContinueWith")}</span>
        <Separator className="flex-1" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending !== null}
        onClick={() => {
          void signInSocial("github");
        }}
      >
        {t("continueWithGitHub")}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending !== null}
        onClick={() => {
          void signInSocial("google");
        }}
      >
        {t("continueWithGoogle")}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending !== null}
        onClick={() => {
          void signInPasskey();
        }}
      >
        {t("passkey")}
      </Button>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
