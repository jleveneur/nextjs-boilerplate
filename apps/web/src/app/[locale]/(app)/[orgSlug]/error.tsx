"use client";

import { Button } from "@repo/ui";
import { useTranslations } from "next-intl";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppShellError({ error, reset }: Props) {
  const t = useTranslations("Shell");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("errorTitle")}</h1>
      <p className="text-muted-foreground text-sm">{error.message}</p>
      <Button type="button" variant="outline" onClick={reset}>
        {t("errorRetry")}
      </Button>
    </div>
  );
}
