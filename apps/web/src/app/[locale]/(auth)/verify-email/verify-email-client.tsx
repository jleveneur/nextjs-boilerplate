"use client";

import { CardContent } from "@repo/ui";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { authErrorMessage } from "../../../../features/auth/auth-utils.ts";
import { Link } from "../../../../i18n/navigation.ts";
import { authClient } from "../../../../lib/auth-client.ts";

type Props = {
  token?: string | undefined;
};

export function VerifyEmailClient({ token }: Props) {
  const t = useTranslations("Auth");
  const [status, setStatus] = useState<"idle" | "verifying" | "verified" | "error">(
    token ? "verifying" : "idle",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (token !== undefined && token.length > 0) {
      void (async () => {
        const { error: resultError } = await authClient.verifyEmail({
          query: { token },
        });
        if (cancelled) return;
        if (resultError) {
          setStatus("error");
          setError(authErrorMessage(resultError, t("errorGeneric")));
          return;
        }
        setStatus("verified");
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [token, t]);

  return (
    <CardContent className="flex flex-col gap-3">
      {status === "verifying" ? (
        <p className="text-muted-foreground text-sm">{t("verifying")}</p>
      ) : null}
      {status === "verified" ? <p className="text-sm">{t("verified")}</p> : null}
      {status === "error" && error ? (
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
