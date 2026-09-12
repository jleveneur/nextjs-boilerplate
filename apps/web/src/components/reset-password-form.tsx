"use client"

import { useForm } from "@tanstack/react-form"
import { useRouter } from "next/navigation"
import * as z from "zod"

import { authClient } from "@repo/auth/client"
import { Button } from "@repo/ui/components/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@repo/ui/components/field"
import { Input } from "@repo/ui/components/input"

import { serverError, submitToServer } from "@/lib/submit-to-server.ts"

const schema = z.object({
  password: z.string().min(8, "Use at least 8 characters."),
})

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()

  const form = useForm({
    defaultValues: { password: "" },
    validators: {
      onSubmit: schema,
      onSubmitAsync: ({ value }) =>
        submitToServer(() => authClient.resetPassword({ newPassword: value.password, token })),
    },
    onSubmit: () => {
      // Resetting does not sign anyone in — the new password still has to be
      // used, which is what proves the person choosing it is the one signing
      // in.
      router.push("/sign-in?reset=1")
      router.refresh()
    },
  })

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field name="password">
          {(field) => (
            <Field data-invalid={!field.state.meta.isValid}>
              <FieldLabel htmlFor={field.name}>New password</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                autoComplete="new-password"
                aria-invalid={!field.state.meta.isValid}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  field.handleChange(event.target.value)
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
            {isSubmitting ? "Saving…" : "Set new password"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
