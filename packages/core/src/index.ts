// oxlint-disable-next-line import/no-unassigned-import
import "server-only";

export { ASSET_ERROR_CODES, AssetDerivationInputMissingError } from "./assets/asset.errors.ts";
export {
  ASSET_CONFIRMED,
  assetConfirmedEvent,
  type AssetConfirmedEvent,
  type AssetConfirmedPayload,
} from "./assets/asset.events.ts";
export {
  confirmUpload,
  markAssetFailed,
  markAssetReady,
  reconcileOrphanAssets,
  requestUpload,
} from "./assets/asset.service.ts";
export {
  BILLING_ERROR_CODES,
  InvoiceAlreadyPaidError,
  InvoiceAlreadyVoidError,
} from "./billing/billing.errors.ts";
export {
  INVOICE_VOIDED,
  invoiceVoidedEvent,
  type InvoiceVoidedEvent,
  type InvoiceVoidedPayload,
} from "./billing/billing.events.ts";
export {
  assertCanVoidInvoice,
  canVoidInvoice,
  type InvoiceResource,
} from "./billing/billing.policy.ts";
export {
  createInvoice,
  getInvoice,
  listInvoicesForOrg,
  resolveInvoiceVoidedRecipientEmail,
  voidInvoice,
} from "./billing/billing.service.ts";
export { subscribeInvoiceVoidedNotify } from "./billing/subscribe-invoice-voided.ts";
export type { Ctx, CtxPorts } from "./ctx.ts";
export {
  applyStripeSubscriptionEvent,
  enqueueStripeWebhookEvent,
  getOrganizationSubscription,
  listBillingCatalog,
  openBillingPortal,
  organizationHasEntitlement,
  startCheckout,
  syncBillingCatalog,
} from "./subscription/subscription.service.ts";
export { mapOutboxEventToJob, type MappedJob } from "./outbox/map-event-to-job.ts";

export {
  relayOutboxBatch,
  type RelayOutboxBatchOptions,
  type RelayOutboxBatchResult,
} from "./outbox/relay.ts";
export {
  writeOutboxEvent,
  type OutboxRow,
  type WriteOutboxEventInput,
} from "./outbox/write-outbox-event.ts";
export { writeAuditLog, type WriteAuditLogInput } from "./write-audit-log.ts";
export { recordAuditLog, type RecordAuditLogInput } from "./record-audit-log.ts";
export type { AnalyticsSink } from "./ports/analytics.ts";
export { createSystemClock, type Clock } from "./ports/clock.ts";
export {
  createInProcessEventBus,
  type DomainEvent,
  type EventBus,
  type EventHandler,
} from "./ports/event-bus.ts";
export type { FileStore, ObjectHead, PresignedGet, PresignedPut } from "./ports/file-store.ts";
export type { FlagContext, FlagProvider } from "./ports/flags.ts";
export { createUuidIdGenerator, type IdGenerator } from "./ports/id-generator.ts";
export type { EnqueueOptions, EnqueueResult, JobQueue } from "./ports/job-queue.ts";
export {
  adaptEmailMailer,
  type Mailer,
  type SendEmailInput,
  type SendEmailResult,
} from "./ports/mailer.ts";
export type {
  ParsedSubscriptionEvent,
  PaymentGateway,
  PaymentWebhookEvent,
} from "./ports/payment-gateway.ts";

export { systemActorForOrganization } from "./system-actor.ts";
