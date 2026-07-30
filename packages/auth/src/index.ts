// oxlint-disable-next-line import/no-unassigned-import
import "server-only";

export { ac, admin, member, organizationRoles, owner } from "./access-control.ts";
export { apiKeyPrefixForEnv } from "./api-key-prefix.ts";
export { createAuth, type Auth } from "./create-auth.ts";
export {
  resolveActorFromApiKey,
  resolveActorFromSession,
  type ResolveActorFromApiKeyInput,
  type ResolveActorFromSessionInput,
} from "./resolve-actor.ts";
export { isOrganizationRole, permissionsForOrganizationRole } from "./role-permissions.ts";
export type {
  CreateAuthOptions,
  OAuthProviderConfig,
  SendInvitationEmailInput,
  SendMagicLinkInput,
  SendVerificationEmailInput,
} from "./types.ts";
