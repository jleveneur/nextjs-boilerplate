/**
 * Typed capture against the event registry.
 */

import { invariant } from "@repo/utils";

import { events, type EventName, type EventProperties } from "./events.ts";
import type { AnalyticsSink } from "./types.ts";

/**
 * Validates `properties` against the registry schema for `name`, then forwards
 * to the sink. Throws on schema failure (programmer error at the call site).
 */
export async function capture<Name extends EventName>(
  sink: Pick<AnalyticsSink, "capture">,
  name: Name,
  properties: EventProperties<Name>,
): Promise<void> {
  const schema = events[name];
  invariant(schema !== undefined, `Unknown analytics event: ${name}`);
  const parsed = schema.parse(properties);
  await sink.capture(name, parsed);
}
