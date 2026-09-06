"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@repo/ui";
import { slugify } from "@repo/utils";

import { authErrorMessage } from "@/features/auth/auth-utils.ts";
import { useRouter } from "@/i18n/navigation.ts";
import { authClient } from "@/lib/auth-client.ts";

const schema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

type Values = z.infer<typeof schema>;

type Props = {
  orgSlug: string;
  organization: { id: string; name: string; slug: string };
  canManage: boolean;
};

export function OrgGeneralForm({ orgSlug, organization, canManage }: Props) {
  const t = useTranslations("Settings");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: organization.name, slug: organization.slug },
  });

  async function onSubmit(values: Values) {
    setError(null);
    setSaved(false);
    const slug = slugify(values.slug) || values.slug;
    const { error: resultError } = await authClient.organization.update({
      organizationId: organization.id,
      data: { name: values.name, slug },
    });
    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      return;
    }
    setSaved(true);
    if (slug !== orgSlug) {
      router.push(`/${slug}/settings`);
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("orgTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex max-w-md flex-col gap-3"
          onSubmit={(event) => {
            void form.handleSubmit(onSubmit)(event);
          }}
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-name">{t("orgName")}</Label>
            <Input
              id="org-name"
              disabled={!canManage}
              aria-invalid={form.formState.errors.name ? true : undefined}
              {...form.register("name")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-slug">{t("orgSlug")}</Label>
            <Input
              id="org-slug"
              disabled={!canManage}
              aria-invalid={form.formState.errors.slug ? true : undefined}
              {...form.register("slug")}
            />
          </div>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="text-muted-foreground text-sm" role="status">
              {t("orgSaved")}
            </p>
          ) : null}
          {canManage ? (
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {t("orgSave")}
            </Button>
          ) : (
            <p className="text-muted-foreground text-sm">{t("forbidden")}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
