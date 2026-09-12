import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import { SignInForm } from "@/components/sign-in-form.tsx";
import { safeRedirect } from "@/lib/safe-redirect.ts";
import { getSession } from "@/lib/session.ts";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const { next, reset } = await searchParams;
  const destination = safeRedirect(next, "/dashboard");

  if ((await getSession()) !== null) {
    redirect(destination);
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            {reset === undefined ? "Welcome back." : "Password updated — sign in with it."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <SignInForm next={destination} />
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
