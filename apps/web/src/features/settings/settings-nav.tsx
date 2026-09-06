"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation.ts";

import { canManageOrganization } from "./can-manage-organization.ts";

type Props = {
  orgSlug: string;
  role: string;
};

export function SettingsNav({ orgSlug, role }: Props) {
  const t = useTranslations("Settings");
  const pathname = usePathname();
  const manage = canManageOrganization(role);
  const base = `/${orgSlug}/settings`;

  const links = [
    ...(manage
      ? [
          { href: base, label: t("navOrganization"), exact: true },
          { href: `${base}/members`, label: t("navMembers"), exact: false },
          { href: `${base}/api-keys`, label: t("navApiKeys"), exact: false },
        ]
      : []),
    { href: `${base}/account`, label: t("navAccount"), exact: false },
  ];

  return (
    <nav className="border-border mb-6 flex flex-wrap gap-3 border-b pb-3">
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "text-foreground text-sm font-medium"
                : "text-muted-foreground text-sm underline-offset-4 hover:underline"
            }
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
