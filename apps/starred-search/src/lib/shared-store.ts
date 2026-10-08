import { Store } from "./db";

let opening: Promise<Store> | undefined;

/** One connection to the IndexedDB cache for the whole page. */
export function openStore(): Promise<Store> {
  opening ??= Store.open().catch((error) => {
    opening = undefined;
    throw error;
  });
  return opening;
}
