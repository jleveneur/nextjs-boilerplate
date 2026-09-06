"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@repo/ui";
import { slugify } from "@repo/utils";

import { authErrorMessage } from "@/features/auth/auth-utils.ts";
import { useRouter } from "@/i18n/navigation.ts";
import { authClient } from "@/lib/auth-client.ts";

const schema = z.object({
  name: z.string().min(1).max(100),
});

type Values = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateOrgDialog({ open, onOpenChange }: Props) {
  const t = useTranslations("Settings");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  async function onSubmit(values: Values) {
    setError(null);
    const slugBase = slugify(values.name);
    const slug =
      slugBase.length === 0
        ? `org-${Date.now().toString(36)}`
        : `${slugBase}-${Date.now().toString(36).slice(-4)}`;
    const { data, error: resultError } = await authClient.organization.create({
      name: values.name,
      slug,
    });
    if (resultError || data === null) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      return;
    }
    await authClient.organization.setActive({ organizationId: data.id });
    onOpenChange(false);
    form.reset({ name: "" });
    router.push(`/${data.slug}/invoices`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createOrgTitle")}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            void form.handleSubmit(onSubmit)(event);
          }}
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-org-name">{t("createOrgName")}</Label>
            <Input id="create-org-name" autoComplete="organization" {...form.register("name")} />
          </div>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {t("createOrgSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
