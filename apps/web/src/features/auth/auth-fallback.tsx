import { CardContent, CardHeader, Skeleton } from "@repo/ui";

export function AuthFallback() {
  return (
    <>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
      </CardHeader>
      <AuthFormFallback />
    </>
  );
}

function AuthFormFallback() {
  return (
    <CardContent className="flex flex-col gap-3">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </CardContent>
  );
}
