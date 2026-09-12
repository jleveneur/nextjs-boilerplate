"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import * as z from "zod";

import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";

import { serverError, submitToServer } from "@/lib/submit-to-server.ts";

const schema = z.object({
  name: z.string().min(1, "Enter your name."),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});

export function SignUpForm() {
  const router = useRouter();

  const form = useForm({
    defaultValues: { name: "", email: "", password: "" },
    validators: {
      onSubmit: schema,
      onSubmitAsync: ({ value }) =>
        submitToServer(() =>
          authClient.signUp.email({
            ...value,
            // Where the link in the verification email lands. Without it Better
            // Auth sends the newly confirmed user to `/` — the marketing page —
            // instead of into the product they just signed up for.
            callbackURL: "/dashboard",
          }),
        ),
    },
    onSubmit: ({ value }) => {
      // Addresses must be verified, so sign-up produces no session. The link
      // in the email is what signs the user in.
      router.push(`/verify-email?email=${encodeURIComponent(value.email)}`);
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
        <form.Field name="name">
          {(field) => (
            <Field data-invalid={!field.state.meta.isValid}>
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                autoComplete="name"
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
              <FieldLabel htmlFor={field.name}>Password</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                autoComplete="new-password"
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
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
