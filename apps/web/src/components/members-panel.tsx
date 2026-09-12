"use client";

import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";

import { authClient } from "@repo/auth/client";
import { roleNames, type Role } from "@repo/authz";
import { Button, Input, Label, cn } from "@repo/ui";

import { useSubmit } from "@/lib/use-submit.ts";

export type MemberRow = {
  id: string;
  role: string;
  email: string;
  name: string;
};

export type InvitationRow = {
  id: string;
  email: string;
  role: string;
};

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
  members: MemberRow[];
  invitations: InvitationRow[];
  canInvite: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { pending, error, run } = useSubmit();

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSentTo(null);

    void run(
      () => authClient.organization.inviteMember({ email, role }),
      () => {
        setSentTo(email);
        setEmail("");
        router.refresh();
      },
    );
  }

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
        <form className="flex items-end gap-2" onSubmit={submit}>
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="invite-email">Invite by email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@example.com"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-role" className="sr-only">
              Role
            </Label>
            <select
              id="invite-role"
              value={role}
              onChange={(event) => {
                setRole(toRole(event.target.value));
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
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? "Inviting…" : "Invite"}
          </Button>
        </form>
      ) : null}

      {sentTo === null ? null : (
        <p className="text-muted-foreground text-sm" role="status">
          Invitation sent to {sentTo}.
        </p>
      )}

      {error === null ? null : (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

/** The select can only hold these values, but its `value` is typed as string. */
function toRole(value: string): Role {
  return roleNames.find((name) => name === value) ?? "member";
}
