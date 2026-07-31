"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, CardContent, Input, Label } from "@repo/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { authErrorMessage } from "../../../../features/auth/auth-utils.ts";
import { Link, useRouter } from "../../../../i18n/navigation.ts";
import { authClient } from "../../../../lib/auth-client.ts";

const resetSchema = z.object({
  password: z.string().min(8).max(128),
});

type ResetValues = z.infer<typeof resetSchema>;

type Props = {
  token?: string | undefined;
};

export function ResetPasswordForm({ token }: Props) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "" },
  });

  if (token === undefined || token.length === 0) {
    return (
      <CardContent className="flex flex-col gap-3">
        <p className="text-destructive text-sm" role="alert">
          {t("missingToken")}
        </p>
        <Link href="/forgot-password" className="text-sm underline-offset-4 hover:underline">
          {t("forgotPassword")}
        </Link>
      </CardContent>
    );
  }

  const resetToken = token;

  async function onSubmit(values: ResetValues) {
    setError(null);
    const { error: resultError } = await authClient.resetPassword({
      newPassword: values.password,
      token: resetToken,
    });

    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      return;
    }

    router.push("/sign-in");
  }

  return (
    <CardContent className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event);
        }}
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reset-password">{t("password")}</Label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={form.formState.errors.password ? true : undefined}
            {...form.register("password")}
          />
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {t("resetSubmit")}
        </Button>
      </form>
      <Link href="/sign-in" className="text-sm underline-offset-4 hover:underline">
        {t("backToSignIn")}
      </Link>
    </CardContent>
  );
}
