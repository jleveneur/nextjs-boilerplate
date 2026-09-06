"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@repo/ui";

import { authErrorMessage } from "@/features/auth/auth-utils.ts";
import { authClient } from "@/lib/auth-client.ts";

const profileSchema = z.object({
  name: z.string().min(1).max(100),
});

type ProfileValues = z.infer<typeof profileSchema>;

type Props = {
  name: string;
  email: string;
};

export function AccountProfileCard({ name, email }: Props) {
  const t = useTranslations("Settings");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name },
  });

  async function onSave(values: ProfileValues) {
    setError(null);
    setSaved(false);
    const { error: resultError } = await authClient.updateUser({ name: values.name });
    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      return;
    }
    setSaved(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("accountTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-destructive mb-3 text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <form
          className="flex max-w-md flex-col gap-3"
          onSubmit={(event) => {
            void form.handleSubmit(onSave)(event);
          }}
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name">{t("profileName")}</Label>
            <Input id="profile-name" autoComplete="name" {...form.register("name")} />
          </div>
          <p className="text-muted-foreground text-sm">{email}</p>
          {saved ? (
            <p className="text-muted-foreground text-sm" role="status">
              {t("profileSaved")}
            </p>
          ) : null}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {t("profileSave")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
