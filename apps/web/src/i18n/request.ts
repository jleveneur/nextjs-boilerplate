import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { locale as localeRootParam } from "next/root-params";

import { routing } from "./routing.ts";

async function loadMessages(locale: string): Promise<Record<string, unknown>> {
  switch (locale) {
    case "fr":
      return (await import("@/messages/fr.json")).default;
    case "en":
    default:
      return (await import("@/messages/en.json")).default;
  }
}

export default getRequestConfig(async ({ locale: localeOverride }) => {
  const resolved = localeOverride ?? (await localeRootParam());
  if (!hasLocale(routing.locales, resolved)) {
    notFound();
  }

  return {
    locale: resolved,
    messages: await loadMessages(resolved),
  };
});
