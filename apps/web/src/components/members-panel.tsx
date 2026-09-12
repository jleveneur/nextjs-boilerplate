"use client"

import { useForm } from "@tanstack/react-form"
import { cn } from "cn"
import { useRouter } from "next/navigation"
import { useState } from "react"
import * as z from "zod"

import { authClient } from "@repo/auth/client"
import { roleNames, type Role } from "@repo/authz"
import { Button } from "@repo/ui/components/button"
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field"
import { Input } from "@repo/ui/components/input"

import { serverError, submitToServer } from "@/lib/submit-to-server.ts"

export type MemberRow = {
  id: string
  role: string
  email: string
  name: string
}

export type InvitationRow = {
  id: string
  email: string
  role: string
}

const schema = z.object({
  email: z.email("Enter a valid email address."),
  role: z.enum(roleNames),
})

/**
 * Members of the active organization, and the invite form.
 *
 * Inviting goes through `authClient` rather than the oRPC router because
 * Better Auth owns the invitation lifecycle — it writes the row, enforces the
 * inviter's permission, and calls `sendInvitationEmail`. Re-implementing any
 * of that in a procedure would be a second place for the rules to live.
 *
 * `canInvite` only decides whether the form renders. The server checks the
 * same permission on every call.
 */
export function MembersPanel({
  members,
  invitations,
  canInvite,
}: {
  members: MemberRow[]
  invitations: InvitationRow[]
  canInvite: boolean
}) {
  const router = useRouter()
  const [sentTo, setSentTo] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: "", role: "member" },
    validators: {
      onSubmit: schema,
      // The schema has already rejected anything else; `toRole` is what tells
      // the compiler so, since the field's value is typed as a plain string.
      onSubmitAsync: ({ value }) =>
        submitToServer(() =>
          authClient.organization.inviteMember({ email: value.email, role: toRole(value.role) }),
        ),
    },
    onSubmit: ({ value }) => {
      setSentTo(value.email)
      // Keeps the chosen role, so inviting a second person to it is one field.
      form.reset({ email: "", role: value.role })
      router.refresh()
    },
  })

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-medium">Members</h2>

      <ul className="divide-border divide-y rounded-lg border">
        {members.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm">
              {item.name}
              <span className="text-muted-foreground"> · {item.email}</span>
            </span>
            <span className="text-muted-foreground text-sm">{item.role}</span>
          </li>
        ))}

        {invitations.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-muted-foreground text-sm">{item.email}</span>
            <span className="text-muted-foreground text-sm">{item.role} · invited</span>
          </li>
        ))}
      </ul>

      {canInvite ? (
        <form
          noValidate
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            setSentTo(null)
            void form.handleSubmit()
          }}
        >
          <form.Field name="email">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid} className="flex-1">
                <FieldLabel htmlFor={field.name}>Invite by email</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  placeholder="teammate@example.com"
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

          <form.Field name="role">
            {(field) => (
              <Field className="w-auto">
                <select
                  aria-label="Role"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(toRole(event.target.value))
                  }}
                  className={cn(
                    "border-input bg-background h-8 rounded-lg border px-2 text-sm",
                    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
                  )}
                >
                  {roleNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Inviting…" : "Invite"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      ) : null}

      {sentTo === null ? null : (
        <p className="text-muted-foreground text-sm" role="status">
          Invitation sent to {sentTo}.
        </p>
      )}

      <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(error) => <FieldError>{serverError(error)}</FieldError>}
      </form.Subscribe>
    </section>
  )
}

/** The select can only hold these values, but its `value` is typed as string. */
function toRole(value: string): Role {
  return roleNames.find((name) => name === value) ?? "member"
}
