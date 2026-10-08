import { describe, expect, it } from "vitest";
import {
  forgetAccount,
  loadAccount,
  parseLogin,
  type Storages,
  saveAccount,
} from "../src/lib/account";

function memory(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

function storages(): Storages {
  return { persistent: memory(), session: memory() };
}

describe("parseLogin", () => {
  it.each([
    ["dubu", "dubu"],
    ["  dubu  ", "dubu"],
    ["@dubu", "dubu"],
    ["https://github.com/dubu", "dubu"],
    ["github.com/dubu/", "dubu"],
    ["https://github.com/dubu/some-repo", "dubu"],
    ["a-b-c", "a-b-c"],
  ])("reads %j as %j", (input, login) => {
    expect(parseLogin(input)).toBe(login);
  });

  it.each(["", "   ", "-dubu", "du bu", "dubu!", "x".repeat(40)])(
    "rejects %j",
    (input) => {
      expect(parseLogin(input)).toBeNull();
    },
  );
});

describe("accounts", () => {
  it("returns null before anything is saved", () => {
    expect(loadAccount(storages())).toBeNull();
  });

  it("keeps a token for the tab only unless asked to remember it", () => {
    const s = storages();

    saveAccount({ login: "dubu", token: "ghp_a", remember: false }, s);

    expect(s.persistent.getItem("starred-search:token")).toBeNull();
    expect(loadAccount(s)).toEqual({
      login: "dubu",
      token: "ghp_a",
      remember: false,
    });

    // A new tab shares the persistent storage but not the session one.
    expect(
      loadAccount({ persistent: s.persistent, session: memory() }),
    ).toEqual({
      login: "dubu",
      token: null,
      remember: false,
    });
  });

  it("keeps a remembered token across tabs", () => {
    const s = storages();

    saveAccount({ login: "dubu", token: "ghp_a", remember: true }, s);

    expect(
      loadAccount({ persistent: s.persistent, session: memory() }),
    ).toEqual({
      login: "dubu",
      token: "ghp_a",
      remember: true,
    });
  });

  it("leaves no copy of the token behind when the choice changes or it is dropped", () => {
    const s = storages();
    saveAccount({ login: "dubu", token: "ghp_a", remember: true }, s);

    saveAccount({ login: "dubu", token: "ghp_a", remember: false }, s);
    expect(s.persistent.getItem("starred-search:token")).toBeNull();

    saveAccount({ login: "dubu", token: null, remember: false }, s);
    expect(s.session.getItem("starred-search:token")).toBeNull();
    expect(loadAccount(s)).toEqual({
      login: "dubu",
      token: null,
      remember: false,
    });
  });

  it("forgets the login and every token copy", () => {
    const s = storages();
    saveAccount({ login: "dubu", token: "ghp_a", remember: true }, s);
    s.session.setItem("starred-search:token", "ghp_b");

    forgetAccount(s);

    expect(loadAccount(s)).toBeNull();
    expect(s.session.getItem("starred-search:token")).toBeNull();
  });
});
