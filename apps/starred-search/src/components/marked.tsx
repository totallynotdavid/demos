import { useMemo } from "react";
import { highlight } from "@/lib/search";

export function Marked({ text, terms }: { text: string; terms: string[] }) {
  const segments = useMemo(() => highlight(text, terms), [text, terms]);
  return segments.map((segment, index) =>
    segment.match ? <mark key={index}>{segment.text}</mark> : segment.text,
  );
}
