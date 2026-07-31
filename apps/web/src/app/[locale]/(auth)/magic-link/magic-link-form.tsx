"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, CardContent, Input, Label } from "@repo/ui";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { authErrorMessage, getPostAuthCallbackURL } from "../../../../features/auth/auth-utils.ts";
import { Link } from "../../../../i18n/navigation.ts";
import { authClient } from "../../../../lib/auth-client.ts";

const magicLinkSchema = z.object({
  email: z.email(),
});

type MagicLinkValues = z.infer<typeof magicLinkSchema>;

type Props = {
  nextPath?: string | undefined;
};

export function MagicLinkForm({ nextPath }: Props) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const form = useForm<MagicLinkValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: MagicLinkValues) {
    setError(null);
    const callbackURL = getPostAuthCallbackURL(nextPath, locale);
    const { error: resultError } = await authClient.signIn.magicLink({
      email: values.email,
      callbackURL,
    });

    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      return;
    }

    setSent(true);
  }

  return (
    <CardContent className="flex flex-col gap-4">
      {sent ? (
        <p className="text-sm">{t("checkEmail")}</p>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            void form.handleSubmit(onSubmit)(event);
          }}
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="magic-link-email">{t("email")}</Label>
            <Input
              id="magic-link-email"
              type="email"
              autoComplete="email"
              aria-invalid={form.formState.errors.email ? true : undefined}
              {...form.register("email")}
            />
          </div>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {t("magicLinkSubmit")}
          </Button>
        </form>
      )}
      <Link href="/sign-in" className="text-sm underline-offset-4 hover:underline">
        {t("backToSignIn")}
      </Link>
    </CardContent>
  );
}
