"use client"

import { useForm } from "@tanstack/react-form"
import { useRouter } from "next/navigation"

import { authClient } from "@repo/auth/client"
import { Button } from "@repo/ui/components/button"
import { FieldError } from "@repo/ui/components/field"

import { serverError, submitToServer } from "@/lib/submit-to-server.ts"

/**
 * Accepting has no fields, but it has a pending state and a server error, so it
 * is still a `useForm` — one submission pattern across the app.
 *
 * No `<form>` element, though: `handleSubmit` does not need one, and a form
 * with nothing in it is a button wearing a costume.
 */
export function AcceptInvitation({ invitationId }: { invitationId: string }) {
  const router = useRouter()

  const form = useForm({
    defaultValues: {},
    validators: {
      // Better Auth rejects an invitation addressed to someone else, so the
      // error covers the common mistake of opening the link while signed in as
      // a different account — and expired or used links.
      onSubmitAsync: () =>
        submitToServer(() => authClient.organization.acceptInvitation({ invitationId })),
    },
    onSubmit: () => {
      router.push("/dashboard")
      router.refresh()
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              void form.handleSubmit()
            }}
          >
            {isSubmitting ? "Joining…" : "Accept invitation"}
          </Button>
        )}
      </form.Subscribe>

      <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(error) => <FieldError>{serverError(error)}</FieldError>}
      </form.Subscribe>
    </div>
  )
}
