/** Time source — inject a fake in tests so “now” is deterministic. */
export type Clock = {
  now(): Date;
};
