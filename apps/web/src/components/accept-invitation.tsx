"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";

import { useSubmit } from "@/lib/use-submit.ts";

export function AcceptInvitation({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const { pending, error, run } = useSubmit();

  return (
    <div className="flex flex-col gap-4">
      <Button
        disabled={pending}
        onClick={() => {
          void run(
            // Better Auth rejects an invitation addressed to someone else, so
            // the error covers the common mistake of opening the link while
            // signed in as a different account — and expired or used links.
            () => authClient.organization.acceptInvitation({ invitationId }),
            () => {
              router.push("/dashboard");
              router.refresh();
            },
          );
        }}
      >
        {pending ? "Joining…" : "Accept invitation"}
      </Button>

      {error === null ? null : (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
