import Link from "next/link";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <Card>
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>That address does not lead anywhere.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/">Back to the start</Link>} />
        </CardContent>
      </Card>
    </main>
  );
}
