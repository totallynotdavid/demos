import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { GitHubClient } from "@/lib/github";
import {
  INITIAL,
  type Problem,
  type SessionState,
  StarredSession,
} from "@/lib/session";

export type { Problem };

export interface Starred extends SessionState {
  /** Asks GitHub whether anything changed, even inside the fresh window. */
  sync(): void;
  /** Rewrites every repo, which also drops the ones no longer starred. */
  resync(): void;
  /** Deletes the cache of this account. False when a sync holds it. */
  clearCache(): Promise<boolean>;
}

const NEVER = () => () => {};
const NOTHING = () => INITIAL;

export function useStarred(
  login: string | null,
  client: GitHubClient | null,
): Starred {
  const [session, setSession] = useState<StarredSession | null>(null);

  useEffect(() => {
    if (!client || !login) {
      setSession(null);
      return;
    }

    const next = new StarredSession({ login, client });
    const onVisible = () => {
      if (document.visibilityState === "visible") next.resume();
    };
    document.addEventListener("visibilitychange", onVisible);
    setSession(next);
    next.start();

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      next.dispose();
    };
  }, [client, login]);

  const state = useSyncExternalStore(
    session?.subscribe ?? NEVER,
    session?.getState ?? NOTHING,
  );

  return {
    ...state,
    sync: useCallback(() => void session?.sync("check"), [session]),
    resync: useCallback(() => void session?.sync("resync"), [session]),
    clearCache: useCallback(
      async () => (await session?.clear()) ?? false,
      [session],
    ),
  };
}
