import { Store } from "./db";

let opening: Promise<Store> | undefined;

export function openStore(): Promise<Store> {
  opening ??= Store.open().catch((error) => {
    opening = undefined;
    throw error;
  });
  return opening;
}
