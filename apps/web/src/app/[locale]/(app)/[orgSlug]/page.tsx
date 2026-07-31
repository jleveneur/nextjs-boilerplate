import { setRequestLocale } from "next-intl/server";

import { redirect } from "../../../../i18n/navigation.ts";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
};

export default async function OrgHomePage({ params }: Props) {
  const { locale, orgSlug } = await params;
  setRequestLocale(locale);
  redirect({ href: `/${orgSlug}/invoices`, locale });
}
