import { redirect } from "next/navigation";

import { isRole, roles } from "@repo/authz";

import { Posts } from "@/components/posts.tsx";
import { SignOutButton } from "@/components/sign-out-button.tsx";
import { api } from "@/lib/api.ts";
import { getSession } from "@/lib/session.ts";

export default async function DashboardPage() {
  const session = await getSession();
  if (session === null) {
    redirect("/sign-in");
  }

  // In-process oRPC calls: the same procedures the browser hits, minus the
  // round trip. The posts seed the client cache so the page renders with data.
  const [organization, posts] = await Promise.all([api.organization.current(), api.post.list()]);

  // Cosmetic only — it decides whether to render a control the user cannot
  // use. `post.delete` checks the same permission again on the server, which
  // is where the decision actually counts.
  const canDelete =
    isRole(organization.role) && roles[organization.role].authorize({ post: ["delete"] }).success;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{organization.name}</h1>
          <p className="text-muted-foreground text-sm">
            {session.user.email} · {organization.role}
          </p>
        </div>
        <SignOutButton />
      </header>

      <Posts initialPosts={posts} canDelete={canDelete} />
    </main>
  );
}
