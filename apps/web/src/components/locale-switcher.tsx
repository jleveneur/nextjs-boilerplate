"use client";

import { useLocale, useTranslations } from "next-intl";
import { Suspense } from "react";

import { defaultLocale, isLocale, locales } from "@repo/i18n";
import { Button, Skeleton } from "@repo/ui";

import { useRouter } from "@/i18n/navigation.ts";

export function LocaleSwitcher() {
  return (
    <Suspense fallback={<Skeleton className="h-7 w-10" />}>
      <LocaleSwitcherControl />
    </Suspense>
  );
}

function LocaleSwitcherControl() {
  const t = useTranslations("Shell");
  const locale = useLocale();
  const router = useRouter();
  const current = isLocale(locale) ? locale : defaultLocale;
  const currentIndex = locales.indexOf(current);
  const next = locales[(currentIndex + 1) % locales.length];

  if (next === undefined) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={t("language")}
      onClick={() => {
        router.replace(pathWithoutLocale(window.location.pathname), { locale: next });
      }}
    >
      {current.toUpperCase()}
    </Button>
  );
}

function pathWithoutLocale(pathname: string): string {
  for (const code of locales) {
    const prefix = `/${code}`;
    if (pathname === prefix) {
      return "/";
    }
    if (pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length);
    }
  }
  return pathname;
}
