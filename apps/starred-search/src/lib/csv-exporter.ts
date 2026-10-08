import type { Repo } from "./types";

export interface Column {
  id: string;
  label: string;
  value: (repo: Repo) => string | number;
  /** Whether the column is ticked when the export dialog opens. */
  default: boolean;
}

export const COLUMNS: Column[] = [
  { id: "owner", label: "Owner", value: (r) => r.owner, default: true },
  { id: "name", label: "Name", value: (r) => r.name, default: true },
  {
    id: "description",
    label: "Description",
    value: (r) => r.description ?? "",
    default: true,
  },
  {
    id: "language",
    label: "Language",
    value: (r) => r.language ?? "",
    default: true,
  },
  {
    id: "topics",
    label: "Topics",
    value: (r) => r.topics.join(";"),
    default: false,
  },
  {
    id: "lists",
    label: "Lists",
    value: (r) => r.lists.join(";"),
    default: false,
  },
  { id: "stars", label: "Stars", value: (r) => r.stars, default: true },
  {
    id: "starredAt",
    label: "Starred at",
    value: (r) => r.starredAt,
    default: true,
  },
  {
    id: "updatedAt",
    label: "Last updated",
    value: (r) => r.updatedAt,
    default: false,
  },
  { id: "url", label: "URL", value: (r) => r.url, default: true },
  {
    id: "readme",
    label: "README",
    value: (r) => r.readme ?? "",
    default: false,
  },
];

/**
 * A cell that starts with one of these is read as a formula by spreadsheets.
 * Descriptions and READMEs are written by strangers, so such cells get a
 * leading quote, which the spreadsheet shows as text.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: string | number): string {
  let text = String(value);
  if (typeof value === "string" && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(repos: Repo[], columnIds: string[]): string {
  const columns = COLUMNS.filter((column) => columnIds.includes(column.id));
  const lines = [columns.map((column) => cell(column.label)).join(",")];
  for (const repo of repos) {
    lines.push(columns.map((column) => cell(column.value(repo))).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
