// oxlint-disable-next-line import/no-unassigned-import
import "server-only";

export type { Ctx, CtxPorts } from "./ctx.ts";
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
export {
  relayOutboxBatch,
  type OutboxEventHandler,
  type OutboxHandlers,
  type RelayOutboxBatchOptions,
  type RelayOutboxBatchResult,
} from "./outbox/relay.ts";
export {
  writeOutboxEvent,
  type OutboxRow,
  type WriteOutboxEventInput,
} from "./outbox/write-outbox-event.ts";
export { recordAuditLog, type RecordAuditLogInput } from "./record-audit-log.ts";
export { systemActorForOrganization } from "./system-actor.ts";
export { writeAuditLog, type WriteAuditLogInput } from "./write-audit-log.ts";
