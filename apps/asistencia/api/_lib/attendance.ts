import { type Answer, classifyAnswer, fold } from "./answers.js";
import type { Cell, Table } from "./gviz.js";
import { ApiError } from "./http.js";

export interface Entry {
  name: string;
  answer: Answer;
  // The answer as written in the sheet, shown when it is neither yes nor no.
  text: string;
  // Wall-clock "YYYY-MM-DDTHH:mm:ss" in the sheet's own zone, or null.
  at: string | null;
}

export interface Summary {
  people: number;
  yes: number;
  no: number;
  other: number;
  submissions: number;
  // Submissions superseded by a later one from the same person.
  replaced: number;
}

export interface Attendance {
  entries: Entry[];
  summary: Summary;
}

interface Columns {
  at: number | null;
  name: number;
  answer: number;
}

// Google Forms names the first column "Marca temporal" or "Timestamp" and
// types it datetime, so the type decides and the label breaks ties.
function findColumns(table: Table): Columns {
  const labelled = table.columns
    .map((column, index) => ({ ...column, index, key: fold(column.label) }))
    .filter((column) => column.key !== "");

  const dated = labelled.filter(
    (c) => c.type === "datetime" || c.type === "date",
  );
  const at =
    dated.find((c) => /marca temporal|timestamp/.test(c.key)) ?? dated[0];
  const rest = labelled.filter((c) => c !== at);

  const name = rest.find((c) => /nombre|name|apellido/.test(c.key)) ?? rest[0];
  const answer =
    rest.find((c) => c !== name && /asist|attend|confirm/.test(c.key)) ??
    rest.find((c) => c !== name);

  if (!name || !answer) {
    throw new ApiError(
      422,
      "columns",
      "El Sheet necesita una columna con el nombre y otra con la asistencia.",
    );
  }
  return { at: at?.index ?? null, name: name.index, answer: answer.index };
}

const text = (cell: Cell | undefined) => (cell?.text ?? "").trim();

export function buildAttendance(table: Table): Attendance {
  const columns = findColumns(table);
  const byPerson = new Map<string, Entry>();
  const anonymous: Entry[] = [];
  let submissions = 0;

  for (const row of table.rows) {
    const name = text(row[columns.name]).replace(/\s+/g, " ");
    const answerText = text(row[columns.answer]);
    if (!name && !answerText) continue;

    submissions += 1;
    const atCell = columns.at === null ? undefined : row[columns.at];
    const entry: Entry = {
      name,
      answer: classifyAnswer(answerText),
      text: answerText,
      at: typeof atCell?.value === "string" ? atCell.value : null,
    };
    if (!name) {
      anonymous.push(entry);
      continue;
    }

    // A teacher can re-sort the sheet, so the timestamp decides which of two
    // answers is later. Without one, the later row wins.
    const key = fold(name);
    const previous = byPerson.get(key);
    if (!previous?.at || !entry.at || entry.at >= previous.at) {
      byPerson.set(key, entry);
    }
  }

  const entries = [...byPerson.values(), ...anonymous].sort((a, b) =>
    (b.at ?? "").localeCompare(a.at ?? ""),
  );
  const count = (answer: Answer) =>
    entries.filter((e) => e.answer === answer).length;

  return {
    entries,
    summary: {
      people: entries.length,
      yes: count("yes"),
      no: count("no"),
      other: count("other"),
      submissions,
      replaced: submissions - entries.length,
    },
  };
}
