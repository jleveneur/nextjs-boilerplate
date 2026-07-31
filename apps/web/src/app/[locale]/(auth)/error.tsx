"use client";

import { Button, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";
import { useTranslations } from "next-intl";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AuthError({ error, reset }: Props) {
  const t = useTranslations("Auth");

  return (
    <>
      <CardHeader>
        <CardTitle>{t("errorGeneric")}</CardTitle>
        <CardDescription>{error.message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" onClick={reset}>
          {t("backToSignIn")}
        </Button>
      </CardContent>
    </>
  );
}
