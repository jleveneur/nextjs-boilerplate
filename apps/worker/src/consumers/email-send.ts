import { asOrganizationId, asUserId } from "@repo/contracts";
import type { Ctx } from "@repo/core";
import type { JobHandler } from "@repo/jobs";
import type { Mailer as EmailMailer } from "@repo/email";
import type { Actor, OrganizationId } from "@repo/types";
import type { Redis } from "ioredis";

import {
  beginJobIdempotency,
  completeJobIdempotency,
  releaseJobIdempotency,
} from "../idempotency.ts";

function systemActor(organizationId: OrganizationId): Actor {
  return {
    userId: asUserId("01900000-0000-7000-8000-000000000000"),
    organizationId,
    role: "owner",
    permissions: [],
    isSystem: true,
  };
}

export function createEmailSendHandler(options: {
  buildCtx: (actor: Actor) => Ctx;
  mailer: EmailMailer;
  idempotencyRedis: Redis;
}): JobHandler<"email.send"> {
  return async (payload) => {
    const lease = await beginJobIdempotency(options.idempotencyRedis, payload.idempotencyKey);
    if (lease.status === "completed") {
      return;
    }
    if (lease.status === "in_progress") {
      throw new Error("idempotency lease held");
    }

    try {
      const ctx = options.buildCtx(systemActor(asOrganizationId(payload.organizationId)));
      await options.mailer.send({
        to: payload.to,
        subject: payload.subject,
        html: `<p>${payload.subject}</p>`,
        headers: { "Idempotency-Key": payload.idempotencyKey },
      });
      ctx.logger.info(
        { to: payload.to, idempotencyKey: payload.idempotencyKey },
        "email.send completed",
      );
      await completeJobIdempotency(options.idempotencyRedis, payload.idempotencyKey, lease.token);
    } catch (error) {
      await releaseJobIdempotency(options.idempotencyRedis, payload.idempotencyKey, lease.token);
      throw error;
    }
  };
}
