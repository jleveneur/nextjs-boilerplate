import { defineRouting } from "next-intl/routing";

import { routing as sharedRouting } from "@repo/i18n";

export const routing = defineRouting({
  locales: [...sharedRouting.locales],
  defaultLocale: sharedRouting.defaultLocale,
  localePrefix: sharedRouting.localePrefix,
});
