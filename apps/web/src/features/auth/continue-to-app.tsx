import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { redirect } from "../../i18n/navigation.ts";
import { getContainer } from "../../server/container.ts";
import { firstOrgInvoicesHref } from "./auth-utils.ts";

type Props = {
  locale: string;
};

/**
 * Resolves the session's first organization and navigates into the app shell.
 * Used as the Better Auth `callbackURL` target after verify / sign-in / magic link.
 */
export async function ContinueToApp({ locale }: Props) {
  const t = await getTranslations("Auth");
  const requestHeaders = await headers();
  const { auth } = getContainer();

  const session = await auth.api.getSession({ headers: requestHeaders });
  if (session === null) {
    return redirect({ href: "/sign-in", locale });
  }

  let organizations: readonly { slug: string }[];
  try {
    organizations = await auth.api.listOrganizations({ headers: requestHeaders });
  } catch {
    return (
      <p className="text-destructive text-sm" role="alert">
        {t("errorGeneric")}
      </p>
    );
  }

  const destination = firstOrgInvoicesHref(organizations, "/");
  if (destination === "/") {
    return (
      <p className="text-destructive text-sm" role="alert">
        {t("noOrganizations")}
      </p>
    );
  }

  return redirect({ href: destination, locale });
}
