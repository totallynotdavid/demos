import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { clearFormCache } from "../api/_lib/form.ts";
import { type Env, form } from "../api/_lib/handlers.ts";
import { startFakeGoogle } from "./google.ts";

const google = startFakeGoogle();
afterAll(() => google.stop());

// This DOM stub provides the elements register.ts looks up without a browser.
class FakeElement {
  hidden = false;
  disabled = false;
  textContent = "";
  focused = false;
  private listeners = new Map<string, (event: unknown) => unknown>();

  setAttribute() {}
  removeAttribute() {}
  querySelector() {
    return null;
  }
  addEventListener(type: string, listener: (event: unknown) => unknown) {
    this.listeners.set(type, listener);
  }
  focus() {
    this.focused = true;
  }
  async click() {
    await this.listeners.get("click")?.({});
  }
}

let elements: Map<string, FakeElement>;
const element = (id: string) => {
  let found = elements.get(id);
  if (!found) {
    found = new FakeElement();
    elements.set(id, found);
  }
  return found;
};

type Route = (path: string) => Promise<Response>;
let route: Route;
let calls: number;

const realFetch = globalThis.fetch;
const globals = globalThis as unknown as Record<string, unknown>;

beforeEach(() => {
  elements = new Map();
  calls = 0;
  clearFormCache();
  globals.document = {
    title: "Registro de asistencia",
    getElementById: element,
  };
  // The page requests relative API paths. Requests from the handler to fake
  // Google use absolute URLs and pass through to the real fetch.
  globals.fetch = (input: string | URL | Request, init?: RequestInit) => {
    if (typeof input !== "string" || !input.startsWith("/api/")) {
      return realFetch(input, init);
    }
    calls++;
    return route(input);
  };
});

afterEach(() => {
  globals.fetch = realFetch;
  delete globals.document;
});

const handler = (env: Env): Route => {
  return (path) => form(new Request(`http://app.test${path}`), env);
};

// Each import simulates a fresh page load because the module reads the DOM at
// evaluation time.
let loads = 0;
async function openPage() {
  await import(`../src/register.ts?load=${loads++}`);
  await settle();
}

async function settle() {
  for (let turn = 0; turn < 20; turn++) await Bun.sleep(1);
}

const shown = (id: string) => !element(id).hidden;

describe("registration page when the form does not open", () => {
  test("asks the visitor to tell the organiser when FORM_URL is not set", async () => {
    route = handler({});
    await openPage();

    expect(shown("load-error")).toBe(true);
    expect(element("load-error-text").textContent).toBe(
      "El formulario aún no está listo. Avisa a quien organiza el evento.",
    );
    expect(shown("retry-btn")).toBe(false);
    expect(shown("attendance-form")).toBe(false);
  });

  test("asks the visitor to tell the organiser when FORM_URL is malformed", async () => {
    route = handler({ FORM_URL: "not a url" });
    await openPage();

    expect(element("load-error-text").textContent).toContain(
      "Avisa a quien organiza el evento",
    );
    expect(shown("retry-btn")).toBe(false);
  });

  test("offers a retry when Google fails", async () => {
    google.forms.set("DOWN", { status: 500 });
    route = handler({
      FORM_URL: `${google.origin}/forms/d/e/DOWN/viewform`,
    });
    await openPage();

    expect(shown("load-error")).toBe(true);
    expect(element("load-error-text").textContent).toBe(
      "No pudimos conectar con el formulario. Inténtalo de nuevo.",
    );
    expect(shown("retry-btn")).toBe(true);
    expect(element("retry-btn").focused).toBe(true);
    expect(shown("attendance-form")).toBe(false);
  });

  test("offers a retry when the network is down", async () => {
    route = () => Promise.reject(new TypeError("fetch failed"));
    await openPage();

    expect(element("load-error-text").textContent).toContain("Inténtalo");
    expect(shown("retry-btn")).toBe(true);
  });

  test("offers a retry when the server answers with a page that is not JSON", async () => {
    route = async () => new Response("<h1>Bad gateway</h1>", { status: 502 });
    await openPage();

    expect(shown("retry-btn")).toBe(true);
  });

  test("Reintentar asks /api/form again and opens the form once it works", async () => {
    google.forms.set("FLAKY", { status: 500 });
    route = handler({
      FORM_URL: `${google.origin}/forms/d/e/FLAKY/viewform`,
    });
    await openPage();
    expect(shown("retry-btn")).toBe(true);
    expect(calls).toBe(1);

    google.forms.set("FLAKY", { status: 200 });
    await element("retry-btn").click();
    await settle();

    expect(calls).toBe(2);
    expect(shown("load-error")).toBe(false);
    expect(shown("attendance-form")).toBe(true);
    expect(element("event-heading").textContent).not.toBe("");
  });
});
