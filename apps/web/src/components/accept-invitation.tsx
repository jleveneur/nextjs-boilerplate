"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui";

export function AcceptInvitation({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setPending(true);
    setError(null);

    try {
      const result = await authClient.organization.acceptInvitation({ invitationId });

      if (result.error) {
        // Better Auth rejects an invitation addressed to someone else, so this
        // covers the common mistake of opening the link while signed in as a
        // different account — as well as expired and already-used links.
        setError(result.error.message ?? "This invitation could not be accepted.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        disabled={pending}
        onClick={() => {
          void accept();
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
