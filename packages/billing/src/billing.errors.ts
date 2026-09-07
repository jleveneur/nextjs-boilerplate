import { ConflictError, defineErrorCode } from "@repo/errors";

export const BILLING_ERROR_CODES = {
  INVOICE_ALREADY_PAID: defineErrorCode("INVOICE_ALREADY_PAID"),
  INVOICE_ALREADY_VOID: defineErrorCode("INVOICE_ALREADY_VOID"),
} as const;

/** Void (or other mutation) refused because the invoice is paid. */
export class InvoiceAlreadyPaidError extends ConflictError {
  constructor(invoiceId: string) {
    super({
      code: BILLING_ERROR_CODES.INVOICE_ALREADY_PAID,
      message: "Invoice is already paid",
      context: { invoiceId },
    });
  }
}

/** Void refused because the invoice is already void. */
export class InvoiceAlreadyVoidError extends ConflictError {
  constructor(invoiceId: string) {
    super({
      code: BILLING_ERROR_CODES.INVOICE_ALREADY_VOID,
      message: "Invoice is already void",
      context: { invoiceId },
    });
  }
}
