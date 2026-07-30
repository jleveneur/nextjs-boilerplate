import { describe, expect, it } from "vitest";

import { createMemoryFileStore } from "./memory-file-store.ts";

describe("createMemoryFileStore", () => {
  it("presigns put/get and supports head/delete", async () => {
    const store = createMemoryFileStore();
    const put = await store.createPresignedPut({
      key: "local/org/asset/id/file",
      contentType: "text/plain",
    });
    expect(put.url).toContain("memory://put/");

    store.putObject(put.key, new TextEncoder().encode("hi"), "text/plain");
    await expect(store.headObject(put.key)).resolves.toMatchObject({
      contentType: "text/plain",
      contentLength: 2,
    });

    const get = await store.createPresignedGet({ key: put.key });
    expect(get.url).toContain("memory://get/");

    await store.deleteObject(put.key);
    await expect(store.headObject(put.key)).resolves.toBeUndefined();
  });
});
