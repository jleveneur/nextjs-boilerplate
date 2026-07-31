import { routing as sharedRouting } from "@repo/i18n";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: [...sharedRouting.locales],
  defaultLocale: sharedRouting.defaultLocale,
  localePrefix: sharedRouting.localePrefix,
});
