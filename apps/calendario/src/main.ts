import {
  type Calendar,
  type DayType,
  generateCalendar,
  isRestDay,
  isWorkDay,
  weekday,
} from "./core/index.ts";

const STORAGE_KEY = "calendario:config";
const MONTH_NAMES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];
const DAY_CLASS: Record<DayType, string> = {
  WORK: "work",
  REST: "rest",
  ORDERING: "ordering",
  HOLIDAY: "holiday",
  WORKING_HOLIDAY: "holiday",
};

interface Config {
  year: number;
  workers: string[];
}

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id}`);
  return found as T;
}

const elements = {
  workersList: element("workersList"),
  addWorkerBtn: element<HTMLButtonElement>("addWorkerBtn"),
  generateBtn: element<HTMLButtonElement>("generateBtn"),
  saveBtn: element<HTMLButtonElement>("saveBtn"),
  yearInput: element<HTMLInputElement>("yearInput"),
  container: element("calendarContainer"),
};

const state = { workers: ["Worker 1"] };

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** FNV-1a, so a worker and year always map to the same schedule. */
function seedFor(text: string): number {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
  }
  return hash >>> 0;
}

function loadConfig(): void {
  try {
    const saved: Config = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "");
    if (Array.isArray(saved.workers) && saved.workers.length > 0) {
      state.workers = saved.workers.map(String);
      if (Number.isInteger(saved.year)) {
        elements.yearInput.value = String(saved.year);
      }
    }
  } catch {
    // Nothing saved yet, or it is unreadable: keep the defaults.
  }
}

function renderWorkers(): void {
  elements.workersList.innerHTML = "";
  state.workers.forEach((worker, index) => {
    const row = document.createElement("div");
    row.className = "worker-row";
    row.innerHTML = `
      <input type="text" class="input-field worker-name-input" value="${escapeHtml(worker)}" data-index="${index}">
      <button type="button" class="icon-btn remove-btn"${state.workers.length === 1 ? "disabled" : ""}>×</button>
    `;

    row.querySelector("input")?.addEventListener("change", (event) => {
      state.workers[index] = (event.target as HTMLInputElement).value;
    });

    row.querySelector(".remove-btn")?.addEventListener("click", () => {
      if (state.workers.length > 1) {
        state.workers.splice(index, 1);
        renderWorkers();
      }
    });

    elements.workersList.appendChild(row);
  });
}

function renderMonth(calendar: Calendar, month: number): string {
  const days = calendar.getMonthDays(month);
  // The grid starts on Sunday, but weekday() starts on Monday.
  const padding = (weekday(days[0].date) + 1) % 7;

  const cells = days
    .map((day) => {
      const dayNumber = Number(day.date.slice(8));
      return `<div class="day-cell ${DAY_CLASS[day.dayType]}" title="${day.date} - ${day.dayType}">${dayNumber}</div>`;
    })
    .join("");

  return `
    <div class="month-card">
      <div class="month-name">${MONTH_NAMES[month - 1]}</div>
      <div class="days-grid">
        ${'<div class="day-cell empty"></div>'.repeat(padding)}
        ${cells}
      </div>
    </div>
  `;
}

function renderCalendars(calendars: { worker: string; calendar: Calendar }[]) {
  elements.container.innerHTML = "";

  for (const { worker, calendar } of calendars) {
    const workDays = calendar.days.filter(isWorkDay).length;
    const restDays = calendar.days.filter(isRestDay).length;
    const months = Array.from({ length: 12 }, (_, i) =>
      renderMonth(calendar, i + 1),
    ).join("");

    const wrapper = document.createElement("div");
    wrapper.className = "calendar-wrapper";
    wrapper.innerHTML = `
      <div class="worker-title">
        ${escapeHtml(worker)}
        <span class="worker-badge">${calendar.year}</span>
        <span class="worker-badge" style="margin-left:auto">Work: ${workDays}</span>
        <span class="worker-badge">Rest: ${restDays}</span>
      </div>
      <div class="months-grid">${months}</div>
    `;
    elements.container.appendChild(wrapper);
  }
}

function generateCalendars(): void {
  const year = Number.parseInt(elements.yearInput.value, 10);
  const names = state.workers.filter((name) => name.trim() !== "");
  if (names.length === 0) names.push("Worker 1");

  try {
    renderCalendars(
      names.map((worker) => ({
        worker,
        calendar: generateCalendar(year, {
          seed: seedFor(`${worker}-${year}`),
        }),
      })),
    );
  } catch (error) {
    alert(`Error: ${error instanceof Error ? error.message : error}`);
  }
}

function saveConfiguration(): void {
  const config: Config = {
    year: Number.parseInt(elements.yearInput.value, 10),
    workers: state.workers,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  alert("Configuración guardada.");
}

loadConfig();
renderWorkers();

elements.addWorkerBtn.addEventListener("click", () => {
  state.workers.push(`Worker ${state.workers.length + 1}`);
  renderWorkers();
});
elements.generateBtn.addEventListener("click", generateCalendars);
elements.saveBtn.addEventListener("click", saveConfiguration);
