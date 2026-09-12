"use client";

import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";

import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";

import { useSubmit } from "@/lib/use-submit.ts";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const { pending, error, run } = useSubmit();

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    void run(
      () => authClient.resetPassword({ newPassword: password, token }),
      () => {
        // Resetting does not sign anyone in — the new password still has to be
        // used, which is what proves the person choosing it is the one signing
        // in.
        router.push("/sign-in?reset=1");
        router.refresh();
      },
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />
      </div>

      {error === null ? null : (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
