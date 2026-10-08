export interface Account {
  login: string;
  token: string | null;
  /** True when the token outlives the tab. */
  remember: boolean;
}

export interface Storages {
  /** Survives closing the browser. */
  persistent: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  /** Gone when the tab closes. */
  session: Pick<Storage, "getItem" | "setItem" | "removeItem">;
}

const LOGIN_KEY = "starred-search:login";
const TOKEN_KEY = "starred-search:token";

const USERNAME = /^[a-z\d](?:[a-z\d-]{0,38})$/i;

/**
 * Accepts `name`, `@name` and a profile link, and returns the login or null
 * when it cannot be one.
 */
export function parseLogin(input: string): string | null {
  const text = input
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
  return USERNAME.test(text) ? text : null;
}

function defaultStorages(): Storages {
  return { persistent: localStorage, session: sessionStorage };
}

export function loadAccount(
  storages: Storages = defaultStorages(),
): Account | null {
  const login = storages.persistent.getItem(LOGIN_KEY);
  if (!login) return null;

  const remembered = storages.persistent.getItem(TOKEN_KEY);
  const token = remembered ?? storages.session.getItem(TOKEN_KEY);
  return { login, token, remember: remembered !== null };
}

/** The token goes to one storage only, so forgetting it cannot miss a copy. */
export function saveAccount(
  account: Account,
  storages: Storages = defaultStorages(),
): void {
  storages.persistent.setItem(LOGIN_KEY, account.login);
  storages.persistent.removeItem(TOKEN_KEY);
  storages.session.removeItem(TOKEN_KEY);

  if (!account.token) return;
  const target = account.remember ? storages.persistent : storages.session;
  target.setItem(TOKEN_KEY, account.token);
}

export function forgetAccount(storages: Storages = defaultStorages()): void {
  storages.persistent.removeItem(LOGIN_KEY);
  storages.persistent.removeItem(TOKEN_KEY);
  storages.session.removeItem(TOKEN_KEY);
}
