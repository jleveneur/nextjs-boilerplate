"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
} from "@repo/ui";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useRouter } from "../i18n/navigation.ts";
import { authClient } from "../lib/auth-client.ts";

type Org = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  currentSlug: string;
};

export function OrgSwitcher({ currentSlug }: Props) {
  const t = useTranslations("Shell");
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await authClient.organization.list({});
      if (cancelled) return;
      if (data === null || data === undefined) {
        setOrgs([]);
        return;
      }
      setOrgs(
        data.map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = orgs?.find((org) => org.slug === currentSlug);

  async function selectOrg(org: Org) {
    if (org.slug === currentSlug || pending) return;
    setPending(true);
    try {
      await authClient.organization.setActive({ organizationId: org.id });
      router.push(`/${org.slug}/invoices`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (orgs === null) {
    return <Skeleton className="h-8 w-36" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="outline" size="sm" disabled={pending} />}
      >
        {current?.name ?? t("switchOrg")}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("switchOrg")}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {orgs.length === 0 ? (
          <DropdownMenuItem disabled>{t("noOrganizations")}</DropdownMenuItem>
        ) : (
          orgs.map((org) => (
            <DropdownMenuItem
              key={org.id}
              disabled={pending || org.slug === currentSlug}
              onClick={() => {
                void selectOrg(org);
              }}
            >
              {org.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
