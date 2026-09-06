"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@repo/ui";

import { authErrorMessage } from "@/features/auth/auth-utils.ts";
import { authClient } from "@/lib/auth-client.ts";

const passwordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
});

type PasswordValues = z.infer<typeof passwordSchema>;

export function AccountPasswordCard() {
  const t = useTranslations("Settings");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  async function onChangePassword(values: PasswordValues) {
    setError(null);
    setSaved(false);
    const { error: resultError } = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: true,
    });
    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      return;
    }
    setSaved(true);
    form.reset({ currentPassword: "", newPassword: "" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("passwordSave")}</CardTitle>
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
            void form.handleSubmit(onChangePassword)(event);
          }}
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="current-password">{t("passwordCurrent")}</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              {...form.register("currentPassword")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">{t("passwordNew")}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              {...form.register("newPassword")}
            />
          </div>
          {saved ? (
            <p className="text-muted-foreground text-sm" role="status">
              {t("passwordSaved")}
            </p>
          ) : null}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {t("passwordSave")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
