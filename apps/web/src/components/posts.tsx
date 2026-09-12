"use client"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as z from "zod"

// Type-only import: `Post` is `typeof post.$inferSelect`, so nothing from
// `@repo/db` reaches the browser bundle.
import type { Post } from "@repo/db"
import { Button } from "@repo/ui/components/button"
import { Field, FieldError } from "@repo/ui/components/field"
import { Input } from "@repo/ui/components/input"

import { orpc } from "@/lib/orpc.ts"
import { serverError } from "@/lib/submit-to-server.ts"

const schema = z.object({
  title: z.string().min(1, "Write something first.").max(200, "Keep it under 200 characters."),
})

/**
 * The example slice, end to end: an oRPC query scoped to the active
 * organization, two permission-gated mutations, and the cache invalidation
 * that ties them together. Delete this with the `post` router.
 *
 * `canDelete` hides a control the caller's role does not grant. It is not the
 * authorization — the server checks the same permission on every call.
 */
export function Posts({ initialPosts, canDelete }: { initialPosts: Post[]; canDelete: boolean }) {
  const queryClient = useQueryClient()

  const posts = useQuery(orpc.post.list.queryOptions({ initialData: initialPosts }))

  const invalidate = () => queryClient.invalidateQueries({ queryKey: orpc.post.list.key() })

  const create = useMutation(orpc.post.create.mutationOptions({ onSuccess: invalidate }))
  const remove = useMutation(orpc.post.delete.mutationOptions({ onSuccess: invalidate }))

  const form = useForm({
    defaultValues: { title: "" },
    validators: {
      onSubmit: schema,
      // oRPC rejects rather than returning `{ error }`, which is the other half
      // of what `submitToServer` normalises — so this one is written out.
      onSubmitAsync: async ({ value }) => {
        try {
          await create.mutateAsync({ title: value.title })
          return null
        } catch (error) {
          const message = error instanceof Error ? error.message : "Something went wrong."
          return { form: message, fields: {} }
        }
      },
    },
    onSubmit: () => {
      form.reset()
    },
  })

  return (
    <section className="flex flex-col gap-4">
      <form
        noValidate
        className="flex items-start gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <form.Field name="title">
          {(field) => (
            <Field data-invalid={!field.state.meta.isValid} className="flex-1">
              <Input
                aria-label="Post"
                placeholder="Write something…"
                maxLength={200}
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

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting}>
              Add
            </Button>
          )}
        </form.Subscribe>
      </form>

      <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(error) => <FieldError>{serverError(error)}</FieldError>}
      </form.Subscribe>

      {posts.data.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing here yet.</p>
      ) : (
        <ul className="divide-border divide-y rounded-lg border">
          {posts.data.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="text-sm">{item.title}</span>
              {canDelete ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => {
                    remove.mutate({ id: item.id })
                  }}
                >
                  Delete
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
