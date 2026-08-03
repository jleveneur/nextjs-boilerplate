import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as DbModule from "@repo/db";
import { permissionsForRole } from "@repo/authz";
import { ForbiddenError, NotFoundError, ValidationError } from "@repo/errors";
import type { Actor, OrganizationId, UserId } from "@repo/types";

import type { Ctx } from "../ctx.ts";
import { createTestPorts, type TestPorts } from "../testing/create-test-ports.ts";
import * as repository from "./subscription.repository.ts";
import {
  applyStripeSubscriptionEvent,
  enqueueStripeWebhookEvent,
  getOrganizationSubscription,
  listBillingCatalog,
  openBillingPortal,
  organizationHasEntitlement,
  startCheckout,
  syncBillingCatalog,
} from "./subscription.service.ts";

vi.mock("./subscription.repository.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof repository>();
  return {
    ...actual,
    listMirroredCatalog: vi.fn(),
    upsertCatalogProduct: vi.fn(),
    upsertCatalogPrice: vi.fn(),
    findActiveSubscription: vi.fn(),
    findStripeCustomerId: vi.fn(),
    upsertStripeCustomer: vi.fn(),
    upsertSubscription: vi.fn(),
    replaceEntitlements: vi.fn(),
    hasEntitlementRow: vi.fn(),
  };
});

vi.mock("@repo/db", async (importOriginal) => {
  const actual = await importOriginal<typeof DbModule>();
  return {
    ...actual,
    withTransaction: <T>(_db: unknown, fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}),
  };
});

function brandUserId(id: string): UserId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as UserId;
}

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as OrganizationId;
}

function makeActor(role: "owner" | "member", isSystem = false): Actor {
  return {
    userId: brandUserId("01900000-0000-7000-8000-0000000000aa"),
    organizationId: brandOrganizationId("01900000-0000-7000-8000-000000000001"),
    role,
    permissions: permissionsForRole(role),
    isSystem,
  };
}

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test stub
const silentLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  child: () => silentLogger,
} as unknown as Ctx["logger"];

type TestCtx = Omit<Ctx, "ports"> & { ports: TestPorts };

function makeCtx(actor: Actor = makeActor("owner")): TestCtx {
  const ports = createTestPorts();
  return {
    actor,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- unused under mocks
    db: {} as Ctx["db"],
    logger: silentLogger,
    ports,
  };
}

describe("listBillingCatalog", () => {
  beforeEach(() => {
    vi.mocked(repository.listMirroredCatalog).mockReset();
  });

  it("returns mirrored rows when present", async () => {
    vi.mocked(repository.listMirroredCatalog).mockResolvedValue([
      {
        stripePriceId: "price_1",
        stripeProductId: "prod_1",
        productName: "Pro",
        productDescription: null,
        currency: "USD",
        unitAmountMinor: 1000,
        interval: "month",
        entitlementKeys: "exports:enabled",
        active: true,
      },
      {
        stripePriceId: "price_2",
        stripeProductId: "prod_2",
        productName: "Empty",
        productDescription: "desc",
        currency: "EUR",
        unitAmountMinor: null,
        interval: null,
        entitlementKeys: "",
        active: false,
      },
    ]);
    const result = await listBillingCatalog(makeCtx());
    expect(result).toEqual([
      expect.objectContaining({
        stripePriceId: "price_1",
        productDescription: undefined,
        entitlementKeys: ["exports:enabled"],
      }),
      expect.objectContaining({
        stripePriceId: "price_2",
        productDescription: "desc",
        unitAmountMinor: undefined,
        interval: undefined,
        entitlementKeys: [],
      }),
    ]);
  });

  it("falls back to the payment gateway", async () => {
    vi.mocked(repository.listMirroredCatalog).mockResolvedValue([]);
    const ctx = makeCtx();
    ctx.ports.payments.listCatalogPrices = vi.fn().mockResolvedValue([
      {
        stripePriceId: "price_live",
        stripeProductId: "prod_live",
        productName: "Live",
        productDescription: undefined,
        currency: "USD",
        unitAmountMinor: 2000,
        interval: "year",
        entitlementKeys: [],
        active: true,
      },
    ]);
    await expect(listBillingCatalog(ctx)).resolves.toEqual([
      expect.objectContaining({ stripePriceId: "price_live" }),
    ]);
  });
});

describe("syncBillingCatalog", () => {
  it("upserts products and prices from the gateway", async () => {
    const ctx = makeCtx();
    ctx.ports.payments.listCatalogPrices = vi.fn().mockResolvedValue([
      {
        stripePriceId: "price_1",
        stripeProductId: "prod_1",
        productName: "Pro",
        productDescription: "desc",
        currency: "USD",
        unitAmountMinor: 1000,
        interval: "month",
        entitlementKeys: ["billing:pro"],
        active: true,
      },
    ]);
    await expect(syncBillingCatalog(ctx)).resolves.toEqual({ count: 1 });
    expect(repository.upsertCatalogProduct).toHaveBeenCalled();
    expect(repository.upsertCatalogPrice).toHaveBeenCalled();
  });

  it("denies members", async () => {
    await expect(syncBillingCatalog(makeCtx(makeActor("member")))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});

describe("getOrganizationSubscription", () => {
  it("returns null when none", async () => {
    vi.mocked(repository.findActiveSubscription).mockResolvedValue(null);
    await expect(getOrganizationSubscription(makeCtx())).resolves.toBeNull();
  });

  it("maps an active row", async () => {
    vi.mocked(repository.findActiveSubscription).mockResolvedValue({
      id: "01900000-0000-7000-8000-0000000000bb",
      organizationId: "01900000-0000-7000-8000-000000000001",
      stripeSubscriptionId: "sub_1",
      stripePriceId: "price_1",
      stripeProductId: "prod_1",
      status: "active",
      currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await expect(getOrganizationSubscription(makeCtx())).resolves.toEqual({
      stripeSubscriptionId: "sub_1",
      stripePriceId: "price_1",
      stripeProductId: "prod_1",
      status: "active",
      currentPeriodEnd: "2026-02-01T00:00:00.000Z",
      cancelAtPeriodEnd: false,
    });
  });

  it("maps null period end", async () => {
    vi.mocked(repository.findActiveSubscription).mockResolvedValue({
      id: "01900000-0000-7000-8000-0000000000bb",
      organizationId: "01900000-0000-7000-8000-000000000001",
      stripeSubscriptionId: "sub_1",
      stripePriceId: "price_1",
      stripeProductId: "prod_1",
      status: "trialing",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await expect(getOrganizationSubscription(makeCtx())).resolves.toEqual(
      expect.objectContaining({ currentPeriodEnd: null, cancelAtPeriodEnd: true }),
    );
  });
});

describe("startCheckout", () => {
  beforeEach(() => {
    vi.mocked(repository.findStripeCustomerId).mockReset();
    vi.mocked(repository.upsertStripeCustomer).mockReset();
  });

  it("creates a customer when missing then opens checkout", async () => {
    vi.mocked(repository.findStripeCustomerId).mockResolvedValue(undefined);
    const ctx = makeCtx();
    ctx.ports.payments.createCustomer = vi.fn().mockResolvedValue({ customerId: "cus_new" });
    ctx.ports.payments.createCheckoutSession = vi
      .fn()
      .mockResolvedValue({ url: "https://checkout.test", sessionId: "cs_1" });

    await expect(
      startCheckout(ctx, {
        priceId: "price_1",
        successUrl: "https://app.test/ok",
        cancelUrl: "https://app.test/cancel",
      }),
    ).resolves.toEqual({ url: "https://checkout.test" });
    expect(repository.upsertStripeCustomer).toHaveBeenCalled();
  });

  it("reuses an existing customer", async () => {
    vi.mocked(repository.findStripeCustomerId).mockResolvedValue("cus_existing");
    const ctx = makeCtx();
    const createCustomer = vi.fn();
    const createCheckoutSession = vi
      .fn()
      .mockResolvedValue({ url: "https://checkout.test", sessionId: "cs_1" });
    ctx.ports.payments.createCustomer = createCustomer;
    ctx.ports.payments.createCheckoutSession = createCheckoutSession;
    await startCheckout(ctx, {
      priceId: "price_1",
      successUrl: "https://app.test/ok",
      cancelUrl: "https://app.test/cancel",
    });
    expect(createCustomer).not.toHaveBeenCalled();
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "cus_existing" }),
    );
  });

  it("rejects empty priceId", async () => {
    await expect(
      startCheckout(makeCtx(), {
        priceId: "  ",
        successUrl: "https://app.test/ok",
        cancelUrl: "https://app.test/cancel",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("openBillingPortal", () => {
  it("opens portal for an existing customer", async () => {
    vi.mocked(repository.findStripeCustomerId).mockResolvedValue("cus_1");
    const ctx = makeCtx();
    ctx.ports.payments.createBillingPortalSession = vi
      .fn()
      .mockResolvedValue({ url: "https://portal.test" });
    await expect(openBillingPortal(ctx, { returnUrl: "https://app.test" })).resolves.toEqual({
      url: "https://portal.test",
    });
  });

  it("throws when customer is missing", async () => {
    vi.mocked(repository.findStripeCustomerId).mockResolvedValue(undefined);
    await expect(
      openBillingPortal(makeCtx(), { returnUrl: "https://app.test" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("organizationHasEntitlement", () => {
  it("delegates to the repository", async () => {
    vi.mocked(repository.hasEntitlementRow).mockResolvedValue(true);
    await expect(organizationHasEntitlement(makeCtx(), "exports:enabled")).resolves.toBe(true);
  });
});

describe("enqueueStripeWebhookEvent", () => {
  it("enqueues stripe.event.process with a stable job id", async () => {
    const ctx = makeCtx(makeActor("owner", true));
    const enqueue = vi.spyOn(ctx.ports.jobs, "enqueue");
    await enqueueStripeWebhookEvent(ctx, {
      eventId: "evt_1",
      eventType: "customer.subscription.updated",
      payloadJson: "{}",
    });
    expect(enqueue).toHaveBeenCalledWith(
      "stripe.event.process",
      {
        eventId: "evt_1",
        eventType: "customer.subscription.updated",
        payloadJson: "{}",
      },
      { jobId: "stripe-event-evt_1" },
    );
  });
});

describe("applyStripeSubscriptionEvent", () => {
  beforeEach(() => {
    vi.mocked(repository.upsertStripeCustomer).mockReset();
    vi.mocked(repository.upsertSubscription).mockReset();
    vi.mocked(repository.replaceEntitlements).mockReset();
  });

  it("upserts subscription and entitlements for active status", async () => {
    const ctx = makeCtx(makeActor("owner", true));
    ctx.ports.payments.parseSubscriptionEvent = () => ({
      kind: "subscription_upsert",
      organizationId: "01900000-0000-7000-8000-000000000001",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      stripePriceId: "price_1",
      stripeProductId: "prod_1",
      status: "active",
      currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
      entitlementKeys: ["exports:enabled"],
    });

    await applyStripeSubscriptionEvent(ctx, "{}");

    expect(repository.upsertStripeCustomer).toHaveBeenCalled();
    expect(repository.upsertSubscription).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        stripeSubscriptionId: "sub_1",
        status: "active",
      }),
    );
    expect(repository.replaceEntitlements).toHaveBeenCalledWith(expect.anything(), [
      "exports:enabled",
    ]);
  });

  it("clears entitlements when status is not active/trialing", async () => {
    const ctx = makeCtx(makeActor("owner", true));
    ctx.ports.payments.parseSubscriptionEvent = () => ({
      kind: "subscription_upsert",
      organizationId: "01900000-0000-7000-8000-000000000001",
      stripeCustomerId: undefined,
      stripeSubscriptionId: "sub_1",
      stripePriceId: "",
      stripeProductId: "",
      status: "not-a-real-status",
      currentPeriodStart: undefined,
      currentPeriodEnd: undefined,
      cancelAtPeriodEnd: false,
      entitlementKeys: ["exports:enabled"],
    });
    await applyStripeSubscriptionEvent(ctx, "{}");
    expect(repository.upsertSubscription).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "incomplete", stripePriceId: "unknown" }),
    );
    expect(repository.replaceEntitlements).toHaveBeenCalledWith(expect.anything(), []);
  });

  it("clears entitlements on delete", async () => {
    const ctx = makeCtx(makeActor("owner", true));
    ctx.ports.payments.parseSubscriptionEvent = () => ({
      kind: "subscription_deleted",
      organizationId: "01900000-0000-7000-8000-000000000001",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      stripePriceId: "price_1",
      stripeProductId: "prod_1",
      status: "canceled",
      currentPeriodStart: undefined,
      currentPeriodEnd: undefined,
      cancelAtPeriodEnd: true,
      entitlementKeys: [],
    });

    await applyStripeSubscriptionEvent(ctx, "{}");
    expect(repository.replaceEntitlements).toHaveBeenCalledWith(expect.anything(), []);
  });

  it("no-ops when parse returns undefined", async () => {
    const ctx = makeCtx(makeActor("owner", true));
    ctx.ports.payments.parseSubscriptionEvent = () => undefined;
    await applyStripeSubscriptionEvent(ctx, "{}");
    expect(repository.upsertSubscription).not.toHaveBeenCalled();
  });

  it("skips when organization metadata is missing", async () => {
    const ctx = makeCtx(makeActor("owner", true));
    ctx.ports.payments.parseSubscriptionEvent = () => ({
      kind: "subscription_upsert",
      organizationId: undefined,
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      stripePriceId: "price_1",
      stripeProductId: "prod_1",
      status: "active",
      currentPeriodStart: undefined,
      currentPeriodEnd: undefined,
      cancelAtPeriodEnd: false,
      entitlementKeys: [],
    });
    await applyStripeSubscriptionEvent(ctx, "{}");
    expect(repository.upsertSubscription).not.toHaveBeenCalled();
  });
});
