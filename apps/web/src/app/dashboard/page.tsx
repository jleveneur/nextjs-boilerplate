import { redirect } from "next/navigation";

import { isRole, roles } from "@repo/authz";

import { OrganizationSwitcher } from "@/components/organization-switcher.tsx";
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
  const [current, organizations, posts] = await Promise.all([
    api.organization.current(),
    api.organization.list(),
    api.post.list(),
  ]);

  // Cosmetic only — it decides whether to render a control the user cannot
  // use. `post.delete` checks the same permission again on the server, which
  // is where the decision actually counts.
  const canDelete =
    isRole(current.role) && roles[current.role].authorize({ post: ["delete"] }).success;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{current.name}</h1>
          <p className="text-muted-foreground text-sm">
            {session.user.email} · {current.role}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <OrganizationSwitcher organizations={organizations} activeId={current.id} />
          <SignOutButton />
        </div>
      </header>

      <Posts initialPosts={posts} canDelete={canDelete} />
    </main>
  );
}
