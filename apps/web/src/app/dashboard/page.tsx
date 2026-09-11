import { redirect } from "next/navigation";

import { Posts } from "@/components/posts.tsx";
import { SignOutButton } from "@/components/sign-out-button.tsx";
import { api } from "@/lib/api.ts";
import { getSession } from "@/lib/session.ts";

export default async function DashboardPage() {
  const session = await getSession();
  if (session === null) {
    redirect("/sign-in");
  }

  // In-process oRPC call: the same procedure the browser hits, minus the round
  // trip. The result seeds the client cache so the page renders with data.
  const posts = await api.post.list();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Signed in as {session.user.email}</p>
        </div>
        <SignOutButton />
      </header>

      <Posts initialPosts={posts} />
    </main>
  );
}
