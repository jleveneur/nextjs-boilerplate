import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";

import { SignUpForm } from "@/components/sign-up-form.tsx";
import { getSession } from "@/lib/session.ts";

export default async function SignUpPage() {
  if ((await getSession()) !== null) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <Card>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Email and password, nothing else to configure.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <SignUpForm />
          <p className="text-muted-foreground text-sm">
            Already registered?{" "}
            <Link href="/sign-in" className="text-foreground underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
