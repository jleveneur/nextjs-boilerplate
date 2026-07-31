"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createInvoiceInputSchema, type CreateInvoiceInput } from "@repo/contracts";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Link, useRouter } from "../../i18n/navigation.ts";
import { useCreateInvoice } from "./hooks.ts";

const formSchema = createInvoiceInputSchema;
type FormValues = CreateInvoiceInput;

type Props = {
  orgSlug: string;
};

export function CreateInvoiceForm({ orgSlug }: Props) {
  const t = useTranslations("Billing");
  const router = useRouter();
  const createInvoice = useCreateInvoice();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      number: "",
      currency: "USD",
      status: "draft",
    },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const parsed = formSchema.parse(values);
    try {
      const invoice = await createInvoice.mutateAsync(parsed);
      router.push(`/${orgSlug}/invoices/${invoice.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveError"));
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("create")}</h1>
        <Link
          href={`/${orgSlug}/invoices`}
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          {t("backToList")}
        </Link>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event);
        }}
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invoice-number">{t("number")}</Label>
          <Input
            id="invoice-number"
            autoComplete="off"
            aria-invalid={form.formState.errors.number ? true : undefined}
            {...form.register("number")}
          />
          {form.formState.errors.number ? (
            <p className="text-destructive text-xs">{form.formState.errors.number.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invoice-amount">{t("amountMinor")}</Label>
          <Input
            id="invoice-amount"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            aria-invalid={form.formState.errors.amountMinor ? true : undefined}
            {...form.register("amountMinor", { valueAsNumber: true })}
          />
          {form.formState.errors.amountMinor ? (
            <p className="text-destructive text-xs">{form.formState.errors.amountMinor.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invoice-currency">{t("currency")}</Label>
          <Controller
            control={form.control}
            name="currency"
            render={({ field }) => (
              <Select
                value={field.value ?? "USD"}
                onValueChange={(value) => {
                  if (value !== null) field.onChange(value);
                }}
              >
                <SelectTrigger id="invoice-currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invoice-status">{t("status")}</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select
                value={field.value ?? "draft"}
                onValueChange={(value) => {
                  if (value !== null) field.onChange(value);
                }}
              >
                <SelectTrigger id="invoice-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t("statusDraft")}</SelectItem>
                  <SelectItem value="open">{t("statusOpen")}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={form.formState.isSubmitting || createInvoice.isPending}>
          {t("create")}
        </Button>
      </form>
    </div>
  );
}
