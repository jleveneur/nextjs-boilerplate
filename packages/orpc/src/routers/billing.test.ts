import { describe, expect, it } from "vitest";

import { BILLING_ERROR_CODES } from "@repo/core";

import { billingRouter } from "./billing.ts";

/**
 * The error contract on `billing.void` spells its codes as plain string
 * literals, because building the enum from `BILLING_ERROR_CODES` widens the
 * schema and `data.appCode` infers as `unknown` — a contract that compiles and
 * buys nothing.
 *
 * That duplication is only safe if it cannot drift, which is what this asserts:
 * renaming a domain code without updating the contract fails here.
 */
describe("billing.void error contract", () => {
  it("declares exactly the domain codes a caller can act on", () => {
    const contract = billingRouter.void["~orpc"].errorMap["CONFLICT"];
    const schema = contract?.data;

    expect(schema).toBeDefined();

    const parsed = schema?.["~standard"].validate({
      appCode: BILLING_ERROR_CODES.INVOICE_ALREADY_PAID,
    });
    expect(parsed).toMatchObject({ value: { appCode: "INVOICE_ALREADY_PAID" } });

    const second = schema?.["~standard"].validate({
      appCode: BILLING_ERROR_CODES.INVOICE_ALREADY_VOID,
    });
    expect(second).toMatchObject({ value: { appCode: "INVOICE_ALREADY_VOID" } });
  });

  it("rejects a code the domain does not define", () => {
    const schema = billingRouter.void["~orpc"].errorMap["CONFLICT"]?.data;
    const result = schema?.["~standard"].validate({ appCode: "NOT_A_DOMAIN_CODE" });

    expect(result).toHaveProperty("issues");
  });
});
