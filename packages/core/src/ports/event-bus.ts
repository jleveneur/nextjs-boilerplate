/**
 * In-process domain event bus.
 *
 * Services emit after a successful commit. Subscribers (tests, composition-root
 * wiring) react — e.g. enqueue a job. The transactional outbox is the durable
 * record; the bus is the in-request fan-out.
 */

export type DomainEvent<TType extends string = string, TPayload = unknown> = {
  type: TType;
  payload: TPayload;
  occurredAt: Date;
};

export type EventHandler<TEvent extends DomainEvent = DomainEvent> = (
  event: TEvent,
) => void | Promise<void>;

export type EventBus = {
  emit(event: DomainEvent): Promise<void>;
  subscribe(type: string, handler: EventHandler): () => void;
};
