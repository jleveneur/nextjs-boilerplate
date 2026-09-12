import Link from "next/link"

import { buttonVariants } from "@repo/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card"

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <Card>
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>That address does not lead anywhere.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* A link, so it stays an anchor — see the note on the home page. */}
          <Link href="/" className={buttonVariants()}>
            Back to the start
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
