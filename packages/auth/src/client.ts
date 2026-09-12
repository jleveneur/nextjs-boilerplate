import { organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import { ac, roles } from "@repo/authz"

/**
 * Browser auth client.
 *
 * No `baseURL`: it defaults to the current origin, which is right on every
 * preview URL and custom domain. A build-time origin is wrong the moment the
 * app is served from somewhere else.
 *
 * The client gets the same `ac` and `roles` as the server so
 * `authClient.organization.checkRolePermission` can answer locally — that is
 * for hiding controls the user cannot use. It is not authorization: the server
 * checks again on every call.
 */
export const authClient = createAuthClient({
  plugins: [organizationClient({ ac, roles })],
})

export const { signIn, signOut, signUp, useSession } = authClient
