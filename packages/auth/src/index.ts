// oxlint-disable-next-line import/no-unassigned-import
import "server-only";

export { ac, admin, member, organizationRoles, owner } from "./access-control.ts";
export { apiKeyPrefixForEnv } from "./api-key-prefix.ts";
export { createAuth, type Auth } from "./create-auth.ts";
export {
  resolveActor,
  resolveActorFromApiKey,
  type ResolveActorFromApiKeyInput,
  type ResolveActorFromSessionInput,
} from "./resolve-actor.ts";
// Re-exported from the layer-0 registry so an auth consumer needs one import.
export { isOrganizationRole, permissionsForRole } from "@repo/permissions";
export type {
  AuthAuditEvent,
  AuthDatabase,
  AuthSchema,
  CreateAuthOptions,
  OAuthProviderConfig,
  OnAuditEvent,
  OnOrganizationCreatedInput,
  OnUserCreatedInput,
  SendInvitationEmailInput,
  SendMagicLinkInput,
  SendVerificationEmailInput,
  SignupMethod,
} from "./types.ts";
