"use client";

import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";

import { authClient } from "@repo/auth/client";
import { Button, Input, Label } from "@repo/ui";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const result = await authClient.resetPassword({ newPassword: password, token });

      if (result.error) {
        setError(result.error.message ?? "Could not reset the password.");
        return;
      }

      // Resetting does not sign anyone in — the new password still has to be
      // used, which is what proves the person choosing it is the one signing in.
      router.push("/sign-in?reset=1");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        void submit(event);
      }}
    >
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
