"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type SubmitEvent } from "react";

// Type-only import: `Post` is `typeof post.$inferSelect`, so nothing from
// `@repo/db` reaches the browser bundle.
import type { Post } from "@repo/db";
import { Button, Input } from "@repo/ui";

import { orpc } from "@/lib/orpc.ts";

/**
 * The example slice, end to end: an oRPC query, two oRPC mutations, and the
 * cache invalidation that ties them together. Delete this with the `post`
 * router.
 */
export function Posts({ initialPosts }: { initialPosts: Post[] }) {
  const [title, setTitle] = useState("");
  const queryClient = useQueryClient();

  const posts = useQuery(orpc.post.list.queryOptions({ initialData: initialPosts }));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: orpc.post.list.key() });

  const create = useMutation(
    orpc.post.create.mutationOptions({
      onSuccess: async () => {
        setTitle("");
        await invalidate();
      },
    }),
  );

  const remove = useMutation(orpc.post.delete.mutationOptions({ onSuccess: invalidate }));

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate({ title });
  }

  return (
    <section className="flex flex-col gap-4">
      <form className="flex gap-2" onSubmit={submit}>
        <Input
          placeholder="Write something…"
          required
          maxLength={200}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
        />
        <Button type="submit" disabled={create.isPending}>
          Add
        </Button>
      </form>

      {create.error === null ? null : (
        <p className="text-destructive text-sm" role="alert">
          {create.error.message}
        </p>
      )}

      {posts.data.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing here yet.</p>
      ) : (
        <ul className="divide-border divide-y rounded-lg border">
          {posts.data.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="text-sm">{item.title}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={remove.isPending}
                onClick={() => {
                  remove.mutate({ id: item.id });
                }}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
