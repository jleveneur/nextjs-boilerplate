import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";

import { SignInForm } from "@/components/sign-in-form.tsx";
import { getSession } from "@/lib/session.ts";

export default async function SignInPage() {
  if ((await getSession()) !== null) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Welcome back.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <SignInForm />
          <p className="text-muted-foreground text-sm">
            No account?{" "}
            <Link href="/sign-up" className="text-foreground underline underline-offset-4">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
