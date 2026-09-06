"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";

import { authErrorMessage } from "@/features/auth/auth-utils.ts";
import { authClient } from "@/lib/auth-client.ts";

const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(["member", "admin"]),
});

type InviteValues = z.infer<typeof inviteSchema>;

type MemberRow = {
  id: string;
  userId: string;
  role: string;
  email: string;
  name: string;
};

type InvitationRow = {
  id: string;
  email: string;
  role: string;
  status: string;
};

type Props = {
  organizationId: string;
  currentUserId: string;
  currentRole: string;
};

export function MembersPanel({ organizationId, currentUserId, currentRole }: Props) {
  const t = useTranslations("Settings");
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [pending, setPending] = useState(false);

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "member" },
  });

  const load = useCallback(async () => {
    const [membersResult, invitationsResult] = await Promise.all([
      authClient.organization.listMembers({ query: { organizationId } }),
      authClient.organization.listInvitations({ query: { organizationId } }),
    ]);
    if (membersResult.error) {
      setError(authErrorMessage(membersResult.error, t("errorGeneric")));
      setMembers([]);
      return;
    }
    const rows = membersResult.data?.members ?? [];
    setMembers(
      rows.map((member) => ({
        id: member.id,
        userId: member.userId,
        role: member.role,
        email: member.user.email,
        name: member.user.name,
      })),
    );
    if (!invitationsResult.error && invitationsResult.data !== null) {
      const pendingInvites: InvitationRow[] = [];
      for (const invitation of invitationsResult.data) {
        if (invitation.status === "pending") {
          pendingInvites.push({
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            status: invitation.status,
          });
        }
      }
      setInvitations(pendingInvites);
    }
  }, [organizationId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onInvite(values: InviteValues) {
    setError(null);
    const { error: resultError } = await authClient.organization.inviteMember({
      email: values.email,
      role: values.role,
      organizationId,
    });
    if (resultError) {
      setError(authErrorMessage(resultError, t("errorGeneric")));
      return;
    }
    form.reset({ email: "", role: "member" });
    await load();
  }

  async function removeMember(memberIdOrEmail: string) {
    setPending(true);
    setError(null);
    try {
      const { error: resultError } = await authClient.organization.removeMember({
        memberIdOrEmail,
        organizationId,
      });
      if (resultError) {
        setError(authErrorMessage(resultError, t("errorGeneric")));
        return;
      }
      await load();
    } finally {
      setPending(false);
    }
  }

  async function updateRole(memberId: string, role: string) {
    setPending(true);
    setError(null);
    try {
      const { error: resultError } = await authClient.organization.updateMemberRole({
        memberId,
        role,
        organizationId,
      });
      if (resultError) {
        setError(authErrorMessage(resultError, t("errorGeneric")));
        return;
      }
      await load();
    } finally {
      setPending(false);
    }
  }

  async function cancelInvitation(invitationId: string) {
    setPending(true);
    setError(null);
    try {
      const { error: resultError } = await authClient.organization.cancelInvitation({
        invitationId,
      });
      if (resultError) {
        setError(authErrorMessage(resultError, t("errorGeneric")));
        return;
      }
      await load();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("membersTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              void form.handleSubmit(onInvite)(event);
            }}
            noValidate
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="invite-email">{t("inviteEmail")}</Label>
              <Input
                id="invite-email"
                type="email"
                autoComplete="email"
                aria-invalid={form.formState.errors.email ? true : undefined}
                {...form.register("email")}
              />
            </div>
            <div className="flex w-40 flex-col gap-1.5">
              <Label htmlFor="invite-role">{t("inviteRole")}</Label>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (value === "member" || value === "admin") {
                        field.onChange(value);
                      }
                    }}
                  >
                    <SelectTrigger id="invite-role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">{t("roleMember")}</SelectItem>
                      <SelectItem value="admin">{t("roleAdmin")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {t("inviteSubmit")}
            </Button>
          </form>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          {members === null ? (
            <p className="text-muted-foreground text-sm">{t("loading")}</p>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("membersEmpty")}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-border text-muted-foreground border-b">
                <tr>
                  <th className="px-2 py-2 font-medium">{t("profileName")}</th>
                  <th className="px-2 py-2 font-medium">{t("inviteEmail")}</th>
                  <th className="px-2 py-2 font-medium">{t("inviteRole")}</th>
                  <th className="px-2 py-2 font-medium">
                    <span className="sr-only">{t("actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-border border-b last:border-0">
                    <td className="px-2 py-3">{member.name}</td>
                    <td className="px-2 py-3">{member.email}</td>
                    <td className="px-2 py-3">
                      {member.role === "owner" || member.userId === currentUserId ? (
                        member.role
                      ) : (
                        <Select
                          value={member.role}
                          disabled={pending || currentRole !== "owner"}
                          onValueChange={(value) => {
                            if (value !== null) {
                              void updateRole(member.id, value);
                            }
                          }}
                        >
                          <SelectTrigger className="w-36" aria-label={t("updateRole")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">{t("roleMember")}</SelectItem>
                            <SelectItem value="admin">{t("roleAdmin")}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      {member.role !== "owner" && member.userId !== currentUserId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => {
                            void removeMember(member.id);
                          }}
                        >
                          {t("removeMember")}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {invitations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("pendingInvitations")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {invitations.map((invitation) => (
                <li
                  key={invitation.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
                >
                  <span className="text-sm">
                    {invitation.email} · {invitation.role}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      void cancelInvitation(invitation.id);
                    }}
                  >
                    {t("cancelInvite")}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
