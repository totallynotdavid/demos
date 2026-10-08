import { useMemo, useSyncExternalStore } from "react";
import type { Account } from "@/lib/account";
import { type ClientSnapshot, GitHubClient } from "@/lib/github";

const API_URL: string | undefined = import.meta.env.VITE_GITHUB_API_URL;

const EMPTY: ClientSnapshot = {
  limits: { core: null, graphql: null },
  stats: { counted: 0, free: 0, skipped: 0 },
};
const noopSubscribe = () => () => {};
const emptySnapshot = () => EMPTY;

/**
 * One client per login and token, shared by every view, so the rate limit it
 * reports covers everything this page asks of GitHub.
 */
export function useClient(account: Account | null): {
  client: GitHubClient | null;
  snapshot: ClientSnapshot;
} {
  const login = account?.login ?? null;
  const token = account?.token ?? null;

  const client = useMemo(
    () =>
      login
        ? new GitHubClient({ token: token ?? undefined, baseUrl: API_URL })
        : null,
    [login, token],
  );
  const snapshot = useSyncExternalStore(
    client ? client.subscribe : noopSubscribe,
    client ? client.getSnapshot : emptySnapshot,
  );
  return { client, snapshot };
}
