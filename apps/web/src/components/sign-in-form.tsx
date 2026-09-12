"use client";

import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as z from "zod";

import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";

import { serverError, submitToServer } from "@/lib/submit-to-server.ts";

const schema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: {
      onSubmit: schema,
      onSubmitAsync: ({ value }) => submitToServer(() => authClient.signIn.email(value)),
    },
    onSubmit: () => {
      router.push(next);
      // The destination is a Server Component that reads the session, so the
      // router cache has to be dropped for it to see the new cookie.
      router.refresh();
    },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="email">
          {(field) => (
            <Field data-invalid={!field.state.meta.isValid}>
              <FieldLabel htmlFor={field.name}>Email</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="email"
                autoComplete="email"
                aria-invalid={!field.state.meta.isValid}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                }}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <Field data-invalid={!field.state.meta.isValid}>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                <Link
                  href="/forgot-password"
                  className="text-muted-foreground text-sm underline underline-offset-4"
                >
                  Forgot?
                </Link>
              </div>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                autoComplete="current-password"
                aria-invalid={!field.state.meta.isValid}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                }}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
      </FieldGroup>

      <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(error) => <FieldError>{serverError(error)}</FieldError>}
      </form.Subscribe>

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
