import { createAuthClient } from "better-auth/react";

/**
 * Browser auth client.
 *
 * No `baseURL`: it defaults to the current origin, which is right on every
 * preview URL and custom domain. A build-time origin is wrong the moment the
 * app is served from somewhere else.
 */
export const authClient = createAuthClient();

export const { signIn, signOut, signUp, useSession } = authClient;
