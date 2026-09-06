import { beforeEach, describe, expect, it, vi } from "vitest";

const connect = vi.fn<() => Promise<void>>();
const config = vi.fn<(...args: string[]) => Promise<unknown>>();
const disconnect = vi.fn<() => void>();

vi.mock("ioredis", () => ({
  Redis: class {
    connect = connect;
    config = config;
    disconnect = disconnect;
  },
}));

const { assertRedisNoEviction } = await import("./redis-policy.ts");

describe("assertRedisNoEviction", () => {
  beforeEach(() => {
    connect.mockResolvedValue();
    config.mockResolvedValue(["maxmemory-policy", "noeviction"]);
    disconnect.mockReset();
  });

  it("passes when Redis will not evict", async () => {
    await expect(assertRedisNoEviction("redis://localhost:6379")).resolves.toBeUndefined();
    expect(config).toHaveBeenCalledWith("GET", "maxmemory-policy");
    expect(disconnect).toHaveBeenCalledOnce();
  });

  /**
   * The whole point of the check: an evicting Redis drops BullMQ jobs with no
   * error, so startup has to refuse rather than run and lose work quietly.
   */
  it("refuses an evicting policy", async () => {
    config.mockResolvedValue(["maxmemory-policy", "allkeys-lru"]);

    await expect(assertRedisNoEviction("redis://localhost:6379")).rejects.toThrow(
      /must be "noeviction".*allkeys-lru/s,
    );
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it.each([
    ["an unexpected reply shape", "not-an-array"],
    ["a truncated reply", ["maxmemory-policy"]],
    ["a non-string value", ["maxmemory-policy", 42]],
  ])("refuses when the policy cannot be read from %s", async (_label, reply) => {
    config.mockResolvedValue(reply);

    // Unreadable is not the same as safe.
    await expect(assertRedisNoEviction("redis://localhost:6379")).rejects.toThrow(
      /must be "noeviction"/,
    );
  });

  it("always releases the connection", async () => {
    connect.mockRejectedValue(new Error("connection refused"));

    await expect(assertRedisNoEviction("redis://localhost:6379")).rejects.toThrow(
      "connection refused",
    );
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
