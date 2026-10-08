import type { Attendance } from "../api/_lib/attendance.ts";
import { ApiFailure, byId, request } from "./api.ts";
import { type Filter, type SortKey, visibleEntries } from "./entries.ts";

interface Snapshot extends Attendance {
  updatedAt: string;
}

interface FormMeta {
  heading: string;
  details: string[];
}

const POLL_MS = 30_000;
const KEY_STORAGE = "asistencia-panel-key";

const el = {
  heading: byId("event-heading"),
  meta: byId("event-meta"),
  gate: byId("gate"),
  gateForm: byId<HTMLFormElement>("gate-form"),
  gateKey: byId<HTMLInputElement>("gate-key"),
  gateError: byId("gate-error"),
  failure: byId("failure"),
  failureTitle: byId("failure-title"),
  failureText: byId("failure-text"),
  loading: byId("loading"),
  content: byId("content"),
  stale: byId("stale"),
  staleTime: byId("stale-time"),
  rows: byId("rows"),
  tableWrap: byId("table-wrap"),
  empty: byId("empty"),
  noMatch: byId("no-match"),
  count: byId("count"),
  updated: byId("updated"),
  replaced: byId("replaced"),
  search: byId<HTMLInputElement>("search"),
  refresh: byId<HTMLButtonElement>("refresh"),
  meter: byId("meter"),
  announce: byId("announce"),
};

const view = {
  query: "",
  filter: "all" as Filter,
  sort: "at" as SortKey,
  descending: true,
};
let snapshot: Snapshot | null = null;
let inFlight = false;

const time = new Intl.DateTimeFormat("es-PE", { timeStyle: "medium" });
const moment = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

// The sheet stores wall-clock times with no zone. Reading them as UTC and
// printing them as UTC keeps the hour the respondent saw.
function formatMoment(at: string | null) {
  return at ? moment.format(new Date(`${at}Z`)) : "—";
}

const ANSWER_LABEL = { yes: "Sí", no: "No" } as const;

function showOnly(section: "loading" | "content" | "failure" | "gate") {
  el.loading.hidden = section !== "loading";
  el.failure.hidden = section !== "failure";
  el.gate.hidden = section !== "gate";
  el.content.hidden = section !== "content";
}

function failureCopy(error: unknown): [string, string] {
  if (error instanceof ApiFailure) {
    switch (error.code) {
      case "not_configured":
      case "bad_config":
        return ["Falta configurar el panel", error.message];
      case "sheet_unreachable":
        return [
          "No se pudo abrir el Sheet",
          "Comparte el Sheet con «Cualquier persona con el enlace» como lector y comprueba SHEET_URL.",
        ];
      case "columns":
        return ["El Sheet no tiene el formato esperado", error.message];
      case "google_unreachable":
        return ["Google no responde", "Inténtalo de nuevo en un momento."];
    }
  }
  return ["No hay conexión", "Revisa tu conexión e inténtalo de nuevo."];
}

// Polls stay silent. Only a refresh the user asked for is read out.
function announce(message: string) {
  el.announce.textContent = "";
  requestAnimationFrame(() => {
    el.announce.textContent = message;
  });
}

async function load(manual = false) {
  if (inFlight) return;
  inFlight = true;
  el.refresh.setAttribute("aria-busy", "true");
  el.refresh.disabled = true;
  if (!snapshot) showOnly("loading");

  const key = sessionStorage.getItem(KEY_STORAGE);
  try {
    snapshot = await request<Snapshot>("/api/attendance", {
      headers: key ? { authorization: `Bearer ${key}` } : {},
    });
    el.stale.hidden = true;
    showOnly("content");
    render();
    if (manual)
      announce(`Lista actualizada. ${snapshot.summary.people} personas.`);
  } catch (error) {
    if (error instanceof ApiFailure && error.code === "unauthorized") {
      sessionStorage.removeItem(KEY_STORAGE);
      snapshot = null;
      showOnly("gate");
      el.gateError.hidden = key === null;
      el.gateKey.focus();
    } else if (snapshot) {
      el.staleTime.textContent = time.format(new Date(snapshot.updatedAt));
      el.stale.hidden = false;
      showOnly("content");
    } else {
      const [title, text] = failureCopy(error);
      el.failureTitle.textContent = title;
      el.failureText.textContent = text;
      showOnly("failure");
      byId("failure-retry").focus();
    }
  } finally {
    inFlight = false;
    el.refresh.removeAttribute("aria-busy");
    el.refresh.disabled = false;
  }
}

function render() {
  if (!snapshot) return;
  const { summary, entries } = snapshot;

  byId("stat-yes").textContent = String(summary.yes);
  byId("stat-no").textContent = String(summary.no);
  byId("stat-other").textContent = String(summary.other);
  byId("stat-other-box").hidden = summary.other === 0;
  byId("stat-people").textContent = String(summary.people);

  const share = (count: number) =>
    summary.people ? `${(count / summary.people) * 100}%` : "0%";
  const [yes, no, other] = Array.from(el.meter.children) as HTMLElement[];
  if (yes && no && other) {
    yes.style.width = share(summary.yes);
    no.style.width = share(summary.no);
    other.style.width = share(summary.other);
  }

  el.replaced.hidden = summary.replaced === 0;
  el.replaced.textContent =
    summary.replaced === 1
      ? "1 persona respondió más de una vez. Se cuenta su última respuesta."
      : `${summary.replaced} respuestas repetidas. Se cuenta la última de cada persona.`;

  const shown = visibleEntries(entries, view);
  const filtering = view.query !== "" || view.filter !== "all";

  el.empty.hidden = entries.length > 0;
  el.noMatch.hidden = !(entries.length > 0 && shown.length === 0);
  el.tableWrap.hidden = shown.length === 0;
  el.count.textContent =
    entries.length === 0
      ? ""
      : filtering
        ? `Mostrando ${shown.length} de ${entries.length}`
        : `${entries.length} ${entries.length === 1 ? "persona" : "personas"}`;

  el.rows.replaceChildren(...shown.map(row));
  el.updated.textContent = `Actualizado a las ${time.format(new Date(snapshot.updatedAt))} · se actualiza solo cada 30 segundos`;
}

function row(entry: Snapshot["entries"][number]) {
  const tr = document.createElement("tr");

  const name = document.createElement("td");
  name.className = "cell-name";
  if (entry.name) {
    name.append(entry.name);
  } else {
    const unnamed = document.createElement("span");
    unnamed.className = "unnamed";
    unnamed.textContent = "Sin nombre";
    name.append(unnamed);
  }
  const sub = document.createElement("span");
  sub.className = "sub";
  sub.textContent = formatMoment(entry.at);
  name.append(sub);

  const answer = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `badge badge-${entry.answer}`;
  badge.textContent =
    entry.answer === "other"
      ? entry.text || "Sin respuesta"
      : ANSWER_LABEL[entry.answer];
  answer.append(badge);

  const when = document.createElement("td");
  when.className = "cell-time";
  const stamp = document.createElement("time");
  if (entry.at) stamp.dateTime = entry.at;
  stamp.textContent = formatMoment(entry.at);
  when.append(stamp);

  tr.append(name, answer, when);
  return tr;
}

function setSort(key: SortKey) {
  if (view.sort === key) {
    view.descending = !view.descending;
  } else {
    view.sort = key;
    view.descending = key === "at";
  }
  for (const th of document.querySelectorAll("th[aria-sort]")) {
    const button = th.querySelector<HTMLElement>("[data-sort]");
    const active = button?.dataset.sort === view.sort;
    th.setAttribute(
      "aria-sort",
      active ? (view.descending ? "descending" : "ascending") : "none",
    );
  }
  render();
}

function resetFilters() {
  view.query = "";
  view.filter = "all";
  el.search.value = "";
  byId<HTMLInputElement>("filter-all").checked = true;
  render();
  el.search.focus();
}

async function loadHeading() {
  try {
    const data = await request<FormMeta>("/api/form");
    el.heading.textContent = data.heading;
    el.meta.textContent = data.details.join(" · ");
    el.meta.hidden = data.details.length === 0;
    document.title = `Lista de asistentes · ${data.heading}`;
  } catch {
    // The list is useful without the event name.
  }
}

el.search.addEventListener("input", () => {
  view.query = el.search.value;
  render();
});

for (const input of document.querySelectorAll<HTMLInputElement>(
  'input[name="filter"]',
)) {
  input.addEventListener("change", () => {
    view.filter = input.value as Filter;
    render();
  });
}

for (const button of document.querySelectorAll<HTMLElement>("[data-sort]")) {
  button.addEventListener("click", () =>
    setSort(button.dataset.sort as SortKey),
  );
}

byId("clear").addEventListener("click", resetFilters);
el.refresh.addEventListener("click", () => load(true));
byId("failure-retry").addEventListener("click", () => load(true));

el.gateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const key = el.gateKey.value.trim();
  if (!key) return;
  sessionStorage.setItem(KEY_STORAGE, key);
  el.gateKey.value = "";
  load(true);
});

// "/" jumps to the search box from anywhere that is not a text field, and
// Escape clears the search while it has focus.
document.addEventListener("keydown", (event) => {
  const target = event.target as HTMLElement;
  const typing = target.matches("input, textarea, select, [contenteditable]");
  if (event.key === "/" && !typing && !el.content.hidden) {
    event.preventDefault();
    el.search.focus();
  } else if (
    event.key === "Escape" &&
    target === el.search &&
    el.search.value
  ) {
    event.preventDefault();
    el.search.value = "";
    view.query = "";
    render();
  }
});

setInterval(() => {
  if (!document.hidden && snapshot) load();
}, POLL_MS);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && snapshot) load();
});

loadHeading();
load();
