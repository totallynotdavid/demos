import { expect, it, vi } from "vitest";
import { openStore } from "../src/lib/shared-store";

it("opens again after a failed open instead of keeping the failure", async () => {
  const open = vi.spyOn(indexedDB, "open").mockImplementationOnce(() => {
    throw new Error("storage is blocked");
  });

  await expect(openStore()).rejects.toThrow("storage is blocked");
  const store = await openStore();

  expect(await store.loadMeta("anyone")).toBeNull();
  expect(await openStore()).toBe(store);
  open.mockRestore();
});
