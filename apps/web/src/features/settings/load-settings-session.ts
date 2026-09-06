// oxlint-disable-next-line import/no-unassigned-import -- credential firewall
import "server-only";

import { headers } from "next/headers";
import { notFound } from "next/navigation";

import type { Locale } from "@repo/i18n";
import { isOrganizationRole } from "@repo/permissions";

import { redirect } from "@/i18n/navigation.ts";
import { getContainer } from "@/server/container.ts";

export type SettingsSession = {
  orgSlug: string;
  locale: string;
  organization: { id: string; name: string; slug: string };
  user: { id: string; name: string; email: string; twoFactorEnabled: boolean };
  role: string;
  canManage: boolean;
};

function twoFactorEnabled(user: object): boolean {
  return Reflect.get(user, "twoFactorEnabled") === true;
}

export async function loadSettingsSession(
  locale: Locale,
  orgSlug: string,
): Promise<SettingsSession> {
  const requestHeaders = await headers();
  const { auth } = getContainer();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (session === null) {
    return redirect({ href: "/sign-in", locale });
  }

  const organizations = await auth.api.listOrganizations({ headers: requestHeaders });
  const organization = organizations.find((org) => org.slug === orgSlug);
  if (organization === undefined) {
    notFound();
  }

  const member = await auth.api.getActiveMemberRole({
    headers: requestHeaders,
    query: { organizationId: organization.id },
  });
  const role = isOrganizationRole(member.role) ? member.role : "member";

  return {
    orgSlug,
    locale,
    organization: { id: organization.id, name: organization.name, slug: organization.slug },
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      twoFactorEnabled: twoFactorEnabled(session.user),
    },
    role,
    canManage: role === "owner" || role === "admin",
  };
}
