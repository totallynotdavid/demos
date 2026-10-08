import { LogOut, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { ActivityView } from "@/components/activity-view";
import { ConnectCard } from "@/components/connect-card";
import { GithubMark } from "@/components/github-mark";
import { LimitPill } from "@/components/limit-pill";
import { StarsView } from "@/components/stars-view";
import { ThemeToggle } from "@/components/theme-toggle";
import { useClient } from "@/hooks/use-client";
import { useStarred } from "@/hooks/use-starred";
import {
  type Account,
  forgetAccount,
  loadAccount,
  saveAccount,
} from "@/lib/account";

type Tab = "stars" | "activity";

const tabFromHash = (): Tab =>
  location.hash === "#activity" ? "activity" : "stars";

export default function App() {
  const [account, setAccount] = useState<Account | null>(loadAccount);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>(tabFromHash);

  const { client, snapshot } = useClient(account);
  const starred = useStarred(account?.login ?? null, client);

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.title = account
      ? `${account.login}'s stars · Starred Search`
      : "Starred Search";
  }, [account]);

  const connect = (next: Account) => {
    saveAccount(next);
    setAccount(next);
    setEditing(false);
  };

  const disconnect = () => {
    forgetAccount();
    setAccount(null);
    setEditing(false);
  };

  const showCard = !account || editing;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-6xl items-center gap-3 px-3 sm:px-4">
          <a href="./" className="flex items-center gap-2 font-semibold">
            <GithubMark className="size-5" />
            <span className="hidden sm:inline">Starred Search</span>
          </a>

          {account && (
            <nav className="flex gap-1" aria-label="Sections">
              {(
                [
                  ["stars", "Stars", "#"],
                  ["activity", "Activity", "#activity"],
                ] as const
              ).map(([id, label, hash]) => (
                <a
                  key={id}
                  href={hash}
                  aria-current={tab === id ? "page" : undefined}
                  className={`rounded-md px-2.5 py-1 text-[13px] font-medium ${
                    tab === id ? "bg-hover" : "text-dim hover:bg-hover"
                  }`}
                >
                  {label}
                </a>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-1">
            {account && client && (
              <LimitPill snapshot={snapshot} hasToken={client.hasToken} />
            )}
            {account && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost h-8 px-2"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="size-3.5 sm:hidden" />
                  <span className="hidden max-w-32 truncate sm:inline">
                    {account.login}
                  </span>
                  <span className="sr-only">Change account or token</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost w-8 px-0"
                  onClick={disconnect}
                  aria-label="Sign out"
                  title="Sign out (keeps the cache)"
                >
                  <LogOut className="size-4" />
                </button>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-4">
        {showCard ? (
          <ConnectCard
            initial={account}
            onConnect={connect}
            onCancel={account ? () => setEditing(false) : undefined}
          />
        ) : tab === "stars" ? (
          <StarsView
            login={account.login}
            hasToken={client?.hasToken ?? false}
            starred={starred}
            onEditAccount={() => setEditing(true)}
          />
        ) : client ? (
          <ActivityView login={account.login} client={client} />
        ) : null}
      </main>
    </div>
  );
}
