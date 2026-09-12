"use client"

import { useRouter } from "next/navigation"

import { authClient } from "@repo/auth/client"
import { Button } from "@repo/ui/components/button"

export function SignOutButton() {
  const router = useRouter()

  async function signOut() {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <Button
      variant="outline"
      onClick={() => {
        void signOut()
      }}
    >
      Sign out
    </Button>
  )
}
