"use client"

import { useForm } from "@tanstack/react-form"
import { cn } from "cn"
import { useRouter } from "next/navigation"
import { useState } from "react"
import * as z from "zod"

import { authClient } from "@repo/auth/client"
import { Button } from "@repo/ui/components/button"
import { Field, FieldError } from "@repo/ui/components/field"
import { Input } from "@repo/ui/components/input"

import { serverError, submitToServer } from "@/lib/submit-to-server.ts"

type Organization = { id: string; name: string; slug: string; role: string }

const schema = z.object({
  name: z.string().refine((value) => toSlug(value) !== "", "Use at least one letter or number."),
})

/**
 * Switches the active organization, and creates new ones.
 *
 * These go through `authClient` rather than the oRPC router on purpose. Both
 * actions change the session, and Better Auth's own route is the only place
 * that can put the refreshed session cookie on the response — routed through
 * oRPC, the cookie cache would keep serving the previous organization for
 * minutes. The server remembers the choice from a session-update hook.
 *
 * Two forms rather than one: switching and creating are separate submissions
 * with separate pending states, and the select submits on change.
 *
 * A native `<select>` rather than a design-system component: one control,
 * keyboard- and screen-reader-correct for free, and the platform picker on
 * mobile. Swap it for a shadcn `Select` when the design calls for it.
 */
export function OrganizationSwitcher({
  organizations,
  activeId,
}: {
  organizations: Organization[]
  activeId: string
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  const switchForm = useForm({
    defaultValues: { organizationId: activeId },
    validators: {
      onSubmitAsync: ({ value }) =>
        submitToServer(() =>
          authClient.organization.setActive({ organizationId: value.organizationId }),
        ),
    },
    // The dashboard is a Server Component that reads the active organization,
    // so the router cache has to be dropped to see the change.
    onSubmit: () => {
      router.refresh()
    },
  })

  const createForm = useForm({
    defaultValues: { name: "" },
    validators: {
      onSubmit: schema,
      onSubmitAsync: ({ value }) =>
        submitToServer(() =>
          authClient.organization.create({ name: value.name, slug: toSlug(value.name) }),
        ),
    },
    onSubmit: () => {
      setCreating(false)
      createForm.reset()
      router.refresh()
    },
  })

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <switchForm.Field name="organizationId">
          {(field) => (
            <Field>
              <switchForm.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <select
                    aria-label="Organization"
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    disabled={isSubmitting}
                    onChange={(event) => {
                      field.handleChange(event.target.value)
                      void switchForm.handleSubmit()
                    }}
                    className={cn(
                      "border-input bg-background h-8 rounded-lg border px-2 text-sm",
                      "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
                      "disabled:pointer-events-none disabled:opacity-50",
                    )}
                  >
                    {organizations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                )}
              </switchForm.Subscribe>
            </Field>
          )}
        </switchForm.Field>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCreating((open) => !open)
          }}
        >
          {creating ? "Cancel" : "New"}
        </Button>
      </div>

      {creating ? (
        <form
          noValidate
          className="flex items-start gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void createForm.handleSubmit()
          }}
        >
          <createForm.Field name="name">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <Input
                  aria-label="Organization name"
                  placeholder="Organization name"
                  maxLength={100}
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
          </createForm.Field>

          <createForm.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" size="sm" disabled={isSubmitting}>
                Create
              </Button>
            )}
          </createForm.Subscribe>
        </form>
      ) : null}

      <switchForm.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(error) => <FieldError>{serverError(error)}</FieldError>}
      </switchForm.Subscribe>

      <createForm.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(error) => <FieldError>{serverError(error)}</FieldError>}
      </createForm.Subscribe>
    </div>
  )
}

/** Better Auth requires a slug; derive one so the form asks for a name only. */
function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 60)
}
