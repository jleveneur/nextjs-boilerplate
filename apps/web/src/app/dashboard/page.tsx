import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@repo/auth"
import { isRole, roles } from "@repo/authz"

import { MembersPanel } from "@/components/members-panel.tsx"
import { OrganizationSwitcher } from "@/components/organization-switcher.tsx"
import { Posts } from "@/components/posts.tsx"
import { SignOutButton } from "@/components/sign-out-button.tsx"
import { api } from "@/lib/api.ts"
import { getSession } from "@/lib/session.ts"

export default async function DashboardPage() {
  const session = await getSession()
  if (session === null) {
    redirect("/sign-in")
  }

  // In-process oRPC calls: the same procedures the browser hits, minus the
  // round trip. The posts seed the client cache so the page renders with data.
  // Members come from Better Auth, which owns the organization's own tables.
  const [current, organizations, posts, full] = await Promise.all([
    api.organization.current(),
    api.organization.list(),
    api.post.list(),
    auth.api.getFullOrganization({ headers: await headers() }),
  ])

  // Cosmetic only — these decide whether to render controls the user cannot
  // use. The server checks the same permissions again on every call, which is
  // where the decision actually counts.
  const role = isRole(current.role) ? roles[current.role] : null
  const canDelete = role?.authorize({ post: ["delete"] }).success ?? false
  const canInvite = role?.authorize({ invitation: ["create"] }).success ?? false

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

      <MembersPanel
        members={(full?.members ?? []).map((item) => ({
          id: item.id,
          role: item.role,
          name: item.user.name,
          email: item.user.email,
        }))}
        invitations={(full?.invitations ?? []).flatMap((item) =>
          item.status === "pending"
            ? [{ id: item.id, email: item.email, role: item.role ?? "member" }]
            : [],
        )}
        canInvite={canInvite}
      />
    </main>
  )
}
