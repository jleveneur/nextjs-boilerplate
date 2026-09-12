import { headers } from "next/headers"

import { auth, type Session } from "@repo/auth"

/** Reads the current session from the request cookies. `null` when signed out. */
export async function getSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() })
}
