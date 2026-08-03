/** Time source — inject a fake in tests so “now” is deterministic. */
export type Clock = {
  now(): Date;
};

export function createSystemClock(): Clock {
  return { now: () => new Date() };
}
