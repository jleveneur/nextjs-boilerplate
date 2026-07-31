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

const signUpSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  password: z.string().min(8).max(128),
});

type SignUpValues = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: SignUpValues) {
    setError(null);
    const { error: resultError } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL: "/verify-email",
    });

    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      return;
    }

    router.push("/verify-email");
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
          <Label htmlFor="sign-up-name">{t("name")}</Label>
          <Input
            id="sign-up-name"
            type="text"
            autoComplete="name"
            aria-invalid={form.formState.errors.name ? true : undefined}
            {...form.register("name")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sign-up-email">{t("email")}</Label>
          <Input
            id="sign-up-email"
            type="email"
            autoComplete="email"
            aria-invalid={form.formState.errors.email ? true : undefined}
            {...form.register("email")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sign-up-password">{t("password")}</Label>
          <Input
            id="sign-up-password"
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
          {t("submitSignUp")}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {t("hasAccount")}{" "}
        <Link href="/sign-in" className="text-foreground underline-offset-4 hover:underline">
          {t("submitSignIn")}
        </Link>
      </p>
    </CardContent>
  );
}
