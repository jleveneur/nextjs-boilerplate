import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AccountPanel } from "@/features/settings/account-panel.tsx";
import { loadSettingsSession } from "@/features/settings/load-settings-session.ts";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Settings" });
  return { title: t("accountTitle") };
}

export default async function SettingsAccountPage({ params }: Props) {
  const { locale, orgSlug } = await params;
  const session = await loadSettingsSession(locale, orgSlug);

  return <AccountPanel user={session.user} />;
}
