"use client";

import { Skeleton } from "@repo/ui";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useRouter } from "../../i18n/navigation.ts";
import { authClient } from "../../lib/auth-client.ts";
import { firstOrgInvoicesHref } from "./auth-utils.ts";

/**
 * Resolves the session's first organization and navigates into the app shell.
 * Used as the Better Auth `callbackURL` target after verify / sign-in / magic link.
 */
export function ContinueToApp() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const session = await authClient.getSession();
      if (cancelled) return;
      if (session.error || session.data === null) {
        router.replace("/sign-in");
        return;
      }

      const { data: orgs, error: listError } = await authClient.organization.list({});
      if (cancelled) return;
      if (listError) {
        setError(listError.message ?? t("errorGeneric"));
        return;
      }

      const destination = firstOrgInvoicesHref(orgs, "/");
      if (destination === "/") {
        setError(t("noOrganizations"));
        return;
      }

      router.replace(destination);
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [router, t]);

  if (error !== null) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-64" />
      <p className="text-muted-foreground text-sm">{t("continuing")}</p>
    </div>
  );
}
