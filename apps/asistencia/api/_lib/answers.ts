export type Answer = "yes" | "no" | "other";

export function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Matches the first word, so "Sí, asistiré" and "No podré ir" classify but
// "Sin respuesta" does not read as yes.
export function classifyAnswer(text: string): Answer {
  const folded = fold(text);
  if (/^(si|yes|true)\b/.test(folded)) return "yes";
  if (/^(no|not|false)\b/.test(folded)) return "no";
  return "other";
}
