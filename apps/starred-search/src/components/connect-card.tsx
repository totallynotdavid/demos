import { KeyRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import { type Account, parseLogin } from "@/lib/account";

interface Props {
  initial?: Account | null;
  onConnect(account: Account): void;
  onCancel?(): void;
}

export function ConnectCard({ initial, onConnect, onCancel }: Props) {
  const [login, setLogin] = useState(initial?.login ?? "");
  const [token, setToken] = useState(initial?.token ?? "");
  const [remember, setRemember] = useState(initial?.remember ?? false);
  const [invalid, setInvalid] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseLogin(login);
    if (!parsed) {
      setInvalid(true);
      return;
    }
    onConnect({ login: parsed, token: token.trim() || null, remember });
  };

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-10 w-full max-w-md space-y-5 rounded-xl border border-line bg-surface p-5 sm:mt-20 sm:p-6"
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Search your starred repositories
        </h1>
        <p className="text-dim">
          Stars are fetched once, kept in this browser, and searched here.
          Nothing goes to a server of ours.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="login" className="text-[13px] font-medium">
          GitHub username
        </label>
        <input
          id="login"
          className="field"
          value={login}
          onChange={(event) => {
            setLogin(event.target.value);
            setInvalid(false);
          }}
          placeholder="octocat"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={invalid}
          aria-describedby={invalid ? "login-error" : undefined}
          // biome-ignore lint/a11y/noAutofocus: the form has one purpose
          autoFocus
        />
        {invalid && (
          <p id="login-error" className="text-[13px] text-danger">
            That is not a GitHub username.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="token" className="text-[13px] font-medium">
          Personal access token <span className="text-dim">(optional)</span>
        </label>
        <input
          id="token"
          type="password"
          className="field font-mono"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-[13px] text-dim">
          Without a token you get 60 requests an hour and search covers names,
          descriptions and topics. A token with no scopes raises the limit to
          5,000 and adds README text and your star lists.{" "}
          <a
            className="underline underline-offset-2"
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            Create one
          </a>
        </p>
        {token && (
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Keep the token on this device
            <span className="text-dim">(otherwise until the tab closes)</span>
          </label>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" className="btn btn-primary">
          {token ? <KeyRound className="size-3.5" /> : null}
          Search stars
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
