/**
 * Browser-safe Better Auth client factory.
 *
 * Must not import `server-only`, Drizzle, or Redis.
 */

import { apiKeyClient } from "@better-auth/api-key/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/client";
import {
  adminClient,
  magicLinkClient,
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins";

import { ac, organizationRoles } from "./access-control.ts";

export type CreateAuthClientOptions = {
  baseURL: string;
};

export function createAppAuthClient(options: CreateAuthClientOptions) {
  return createAuthClient({
    baseURL: options.baseURL,
    plugins: [
      organizationClient({
        ac,
        roles: organizationRoles,
      }),
      apiKeyClient(),
      twoFactorClient(),
      passkeyClient(),
      magicLinkClient(),
      adminClient(),
    ],
  });
}
