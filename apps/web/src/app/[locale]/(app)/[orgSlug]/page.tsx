import { redirect } from "@/i18n/navigation.ts";

type Props = {
  params: Promise<{ locale: string; orgSlug: string }>;
};

export default async function OrgHomePage({ params }: Props): Promise<never> {
  const { locale, orgSlug } = await params;
  return redirect({ href: `/${orgSlug}/invoices`, locale });
}
