import type { Clock } from "../ports/clock.ts";

export function createFakeClock(initial = new Date("2026-01-15T12:00:00.000Z")): Clock & {
  set(next: Date): void;
  advanceMs(ms: number): void;
} {
  let current = initial;
  return {
    now: () => current,
    set(next: Date) {
      current = next;
    },
    advanceMs(ms: number) {
      current = new Date(current.getTime() + ms);
    },
  };
}
