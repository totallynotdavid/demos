import { useState } from "react";
import { formatCount } from "@/lib/format";
import type { Facet, Facets as FacetData, Filters } from "@/lib/search";

const COLLAPSED = 10;

interface GroupProps {
  title: string;
  items: Facet[];
  selected: string[];
  onToggle(value: string): void;
}

function Group({ title, items, selected, onToggle }: GroupProps) {
  const [all, setAll] = useState(false);
  // A selected value stays listed even when the other filters hide it.
  const shown = all ? items : items.slice(0, COLLAPSED);
  const missing = selected.filter(
    (value) => !shown.some((item) => item.value === value),
  );
  const rows = [
    ...missing.map((value) => ({
      value,
      count: items.find((item) => item.value === value)?.count ?? 0,
    })),
    ...shown,
  ];
  if (rows.length === 0) return null;

  return (
    <section className="space-y-1">
      <h2 className="px-2 text-xs font-medium uppercase tracking-wide text-dim">
        {title}
      </h2>
      <ul className={all ? "max-h-80 overflow-y-auto" : undefined}>
        {rows.map(({ value, count }) => {
          const on = selected.includes(value);
          return (
            <li key={value}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(value)}
                className={`flex min-h-8 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-[13px] ${
                  on
                    ? "bg-accent-soft font-medium text-accent"
                    : "hover:bg-hover"
                }`}
              >
                <span className="truncate">{value}</span>
                <span className="tabular-nums text-dim">
                  {formatCount(count)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {items.length > COLLAPSED && (
        <button
          type="button"
          className="px-2 text-xs text-dim hover:text-fg hover:underline"
          onClick={() => setAll(!all)}
        >
          {all ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
}

interface Props {
  facets: FacetData;
  filters: Filters;
  onChange(filters: Filters): void;
}

export function Facets({ facets, filters, onChange }: Props) {
  return (
    <div className="space-y-5">
      <Group
        title="Language"
        items={facets.languages}
        selected={filters.language ? [filters.language] : []}
        onToggle={(value) =>
          onChange({
            ...filters,
            language: filters.language === value ? null : value,
          })
        }
      />
      <Group
        title="Lists"
        items={facets.lists}
        selected={filters.list ? [filters.list] : []}
        onToggle={(value) =>
          onChange({ ...filters, list: filters.list === value ? null : value })
        }
      />
      <Group
        title="Topics"
        items={facets.topics}
        selected={filters.topics}
        onToggle={(value) =>
          onChange({
            ...filters,
            topics: filters.topics.includes(value)
              ? filters.topics.filter((topic) => topic !== value)
              : [...filters.topics, value],
          })
        }
      />
    </div>
  );
}
