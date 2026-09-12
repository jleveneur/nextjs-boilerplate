"use client";

import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";

import { authClient } from "@repo/auth/client";
import { Button, Input, Label } from "@repo/ui";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
        // Where the link in the verification email lands. Without it Better
        // Auth sends the newly confirmed user to `/` — the marketing page —
        // instead of into the product they just signed up for.
        callbackURL: "/dashboard",
      });

      if (result.error) {
        setError(result.error.message ?? "Could not create the account.");
        return;
      }

      // Addresses must be verified, so sign-up produces no session. The link
      // in the email is what signs the user in.
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
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
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
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
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
