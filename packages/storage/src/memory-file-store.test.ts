import { describe, expect, it } from "vitest";

import { createMemoryFileStore } from "./memory-file-store.ts";

describe("createMemoryFileStore", () => {
  it("presigns put/get and supports get/put/head/delete", async () => {
    const store = createMemoryFileStore();
    const put = await store.createPresignedPut({
      key: "local/org/asset/id/file",
      contentType: "text/plain",
    });
    expect(put.url).toContain("memory://put/");

    await store.putObject({
      key: put.key,
      body: new TextEncoder().encode("hi"),
      contentType: "text/plain",
    });
    await expect(store.headObject(put.key)).resolves.toMatchObject({
      contentType: "text/plain",
      contentLength: 2,
    });
    await expect(store.getObject(put.key)).resolves.toEqual(new TextEncoder().encode("hi"));

    const get = await store.createPresignedGet({ key: put.key });
    expect(get.url).toContain("memory://get/");

    await store.deleteObject(put.key);
    await expect(store.headObject(put.key)).resolves.toBeUndefined();
    await expect(store.getObject(put.key)).resolves.toBeUndefined();
  });
});
