/**
 * Record-level invoice policies.
 *
 * RBAC comes from `@repo/authz`; status rules live here so core owns "can this
 * actor void _this_ invoice?".
 */

import { can, deny, PERMISSIONS, type Decision } from "@repo/authz";
import { ERROR_CODES, ForbiddenError } from "@repo/errors";
import type { Actor, OrganizationId } from "@repo/types";

import { InvoiceAlreadyPaidError, InvoiceAlreadyVoidError } from "./billing.errors.ts";
import type { InvoiceStatus } from "./billing.repository.ts";

export type InvoiceResource = {
  id: string;
  organizationId: OrganizationId;
  status: InvoiceStatus;
};

export function canVoidInvoice(actor: Actor, invoice: InvoiceResource): Decision {
  const rbac = can(actor, PERMISSIONS["invoice:void"], {
    organizationId: invoice.organizationId,
  });
  if (!rbac.allowed) {
    return rbac;
  }

  if (invoice.status === "paid") {
    return deny("Invoice is already paid", ERROR_CODES.CONFLICT);
  }

  if (invoice.status === "void") {
    return deny("Invoice is already void", ERROR_CODES.CONFLICT);
  }

  return rbac;
}

/** Authorize void or throw the matching typed error. */
export function assertCanVoidInvoice(actor: Actor, invoice: InvoiceResource): void {
  const decision = canVoidInvoice(actor, invoice);
  if (decision.allowed) {
    return;
  }

  // Status conflicts only after RBAC — otherwise prefer Forbidden (no leak of state).
  if (decision.code === ERROR_CODES.CONFLICT) {
    if (invoice.status === "paid") {
      throw new InvoiceAlreadyPaidError(invoice.id);
    }

    if (invoice.status === "void") {
      throw new InvoiceAlreadyVoidError(invoice.id);
    }
  }

  throw new ForbiddenError({
    message: decision.reason,
    code: decision.code,
    context: {
      action: PERMISSIONS["invoice:void"],
      invoiceId: invoice.id,
      userId: actor.userId,
      organizationId: actor.organizationId,
    },
  });
}
