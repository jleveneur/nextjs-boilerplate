import { describe, expect, it, vi } from "vitest";

const setTag = vi.fn();
const setUser = vi.fn();
const setExtras = vi.fn();
const captureException = vi.fn();

vi.mock("@sentry/node", () => ({
  withScope(
    callback: (scope: {
      setTag: typeof setTag;
      setUser: typeof setUser;
      setExtras: typeof setExtras;
    }) => void,
  ) {
    callback({ setTag, setUser, setExtras });
  },
  captureException,
}));

const { captureUnexpectedException } = await import("./capture-exception.ts");

describe("captureUnexpectedException", () => {
  it("sets scope tags, user, extras, and captures the error", () => {
    setTag.mockClear();
    setUser.mockClear();
    setExtras.mockClear();
    captureException.mockClear();

    const error = new Error("boom");
    captureUnexpectedException(error, {
      requestId: "req_1",
      userId: "user_1",
      organizationId: "org_1",
      extra: { route: "/v1/invoices" },
    });

    expect(setTag).toHaveBeenCalledWith("requestId", "req_1");
    expect(setUser).toHaveBeenCalledWith({
      id: expect.stringMatching(/^[a-f0-9]{32}$/),
      segment: expect.stringMatching(/^[a-f0-9]{32}$/),
    });
    expect(setUser.mock.calls[0]?.[0]).not.toEqual({ id: "user_1", segment: "org_1" });
    expect(setExtras).toHaveBeenCalledWith({ route: "/v1/invoices" });
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it("captures with an empty context", () => {
    captureException.mockClear();
    captureUnexpectedException(new Error("minimal"));
    expect(captureException).toHaveBeenCalledOnce();
  });

  it("sets only hashed organization on the user when userId is absent", () => {
    setUser.mockClear();
    captureUnexpectedException(new Error("org-only"), { organizationId: "org_2" });
    expect(setUser).toHaveBeenCalledWith({
      segment: expect.stringMatching(/^[a-f0-9]{32}$/),
    });
    expect(setUser.mock.calls[0]?.[0]).not.toEqual({ segment: "org_2" });
  });
});
