import Link from "next/link"
import { redirect } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card"

import { ForgotPasswordForm } from "@/components/forgot-password-form.tsx"
import { getSession } from "@/lib/session.ts"

export default async function ForgotPasswordPage() {
  if ((await getSession()) !== null) {
    redirect("/dashboard")
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <Card>
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>We will email you a link to choose a new one.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ForgotPasswordForm />
          <p className="text-muted-foreground text-sm">
            Remembered it?{" "}
            <Link href="/sign-in" className="text-foreground underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
