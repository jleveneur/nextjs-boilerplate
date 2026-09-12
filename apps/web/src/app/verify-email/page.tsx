import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";

import { ResendVerificationButton } from "@/components/resend-verification-button.tsx";
import { getSession } from "@/lib/session.ts";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  // Following the link signs the user in, so arriving here with a session
  // means it has already been used.
  if ((await getSession()) !== null) {
    redirect("/dashboard");
  }

  const { email } = await searchParams;

  return (
    <main className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <Card>
        <CardHeader>
          <CardTitle>Check your inbox</CardTitle>
          <CardDescription>
            {email === undefined
              ? "We sent you a link to confirm your address."
              : `We sent a confirmation link to ${email}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="text-muted-foreground text-sm">
            Open it to finish setting up your account. You will be signed in automatically.
          </p>

          {email === undefined ? null : <ResendVerificationButton email={email} />}

          <p className="text-muted-foreground text-sm">
            Wrong address?{" "}
            <Link href="/sign-up" className="text-foreground underline underline-offset-4">
              Sign up again
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
