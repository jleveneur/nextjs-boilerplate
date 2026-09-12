import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";

import { AcceptInvitation } from "@/components/accept-invitation.tsx";
import { getSession } from "@/lib/session.ts";

/**
 * Where an invitation link lands.
 *
 * Accepting requires a session, so a recipient without an account signs up
 * first and comes back. The invitation id is in the URL and the address is on
 * the row, which is what lets Better Auth reject a link opened by the wrong
 * person.
 */
export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  // Independent, so they overlap rather than queue.
  const [{ invitationId }, session] = await Promise.all([params, getSession()]);

  if (session === null) {
    // Sign in, then come straight back here rather than to the dashboard.
    redirect(`/sign-in?next=${encodeURIComponent(`/accept-invitation/${invitationId}`)}`);
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <Card>
        <CardHeader>
          <CardTitle>Join the organization</CardTitle>
          <CardDescription>
            You are signed in as {session.user.email}. The invitation has to be addressed to that
            account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <AcceptInvitation invitationId={invitationId} />
          <p className="text-muted-foreground text-sm">
            Wrong account?{" "}
            <Link href="/dashboard" className="text-foreground underline underline-offset-4">
              Go to your dashboard
            </Link>{" "}
            and sign out first.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
