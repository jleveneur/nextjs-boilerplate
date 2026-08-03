import { applyStripeSubscriptionEvent, systemActorForOrganization, type Ctx } from "@repo/core";
import type { JobHandler } from "@repo/jobs";
import type { Actor, OrganizationId } from "@repo/types";

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- worker sentinel
const WORKER_ORG_ID = "01900000-0000-7000-8000-000000000010" as OrganizationId;

export function createStripeEventProcessHandler(options: {
  buildCtx: (actor: Actor) => Ctx;
}): JobHandler<"stripe.event.process"> {
  return async (payload) => {
    const ctx = options.buildCtx(systemActorForOrganization(WORKER_ORG_ID));
    ctx.logger.info(
      { eventId: payload.eventId, eventType: payload.eventType },
      "processing stripe event",
    );
    await applyStripeSubscriptionEvent(ctx, payload.payloadJson);
  };
}
