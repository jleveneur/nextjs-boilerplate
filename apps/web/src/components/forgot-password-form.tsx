"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import * as z from "zod";

import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";

import { serverError, submitToServer } from "@/lib/submit-to-server.ts";

const schema = z.object({
  email: z.email("Enter a valid email address."),
});

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: "" },
    validators: {
      onSubmit: schema,
      onSubmitAsync: ({ value }) =>
        submitToServer(() =>
          authClient.requestPasswordReset({
            email: value.email,
            // Better Auth validates the token, then redirects here with it as a
            // query parameter — or with `?error=INVALID_TOKEN` if it has expired.
            redirectTo: "/reset-password",
          }),
        ),
    },
    onSubmit: ({ value }) => {
      setSentTo(value.email);
    },
  });

  if (sentTo !== null) {
    // Deliberately the same message whether or not the address exists: telling
    // the difference is how an attacker enumerates who has an account.
    return (
      <p className="text-sm" role="status">
        If an account exists for {sentTo}, a reset link is on its way.
      </p>
    );
  }

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
      </FieldGroup>

      <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(error) => <FieldError>{serverError(error)}</FieldError>}
      </form.Subscribe>

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send reset link"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
