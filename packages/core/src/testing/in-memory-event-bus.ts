import type { DomainEvent, EventBus, EventHandler } from "../ports/event-bus.ts";

export type InMemoryEventBus = EventBus & {
  readonly emitted: readonly DomainEvent[];
  clear(): void;
};

export function createInMemoryEventBus(): InMemoryEventBus {
  const handlers = new Map<string, Set<EventHandler>>();
  const emitted: DomainEvent[] = [];

  return {
    get emitted() {
      return emitted;
    },
    clear() {
      emitted.length = 0;
    },
    async emit(event: DomainEvent) {
      emitted.push(event);
      const set = handlers.get(event.type);
      if (set === undefined) {
        return;
      }

      // Handlers run in subscription order so tests can rely on sequencing.
      for (const handler of set) {
        // oxlint-disable-next-line eslint/no-await-in-loop -- intentional ordered fan-out
        await handler(event);
      }
    },
    subscribe(type: string, handler: EventHandler) {
      let set = handlers.get(type);
      if (set === undefined) {
        set = new Set();
        handlers.set(type, set);
      }

      set.add(handler);
      return () => {
        set.delete(handler);
      };
    },
  };
}
