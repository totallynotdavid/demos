import { type ReactElement, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cn,
  colors,
  effects,
  sizing,
  spacing,
  states,
  typography,
} from "@/config/design-tokens";
import type { SearchIndex, SortOption } from "@/lib/search-index";

interface SearchUIProps {
  searchIndex: SearchIndex;
  className?: string;
}

export function SearchUI({ searchIndex, className }: SearchUIProps) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");

  const results = useMemo(() => {
    return searchIndex.search(query, sortBy);
  }, [query, sortBy, searchIndex]);

  const highlightText = (text: string, query: string): ReactElement => {
    if (!query.trim()) {
      return <>{text}</>;
    }

    const queryTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    const parts: ReactElement[] = [];
    let lastIndex = 0;
    const textLower = text.toLowerCase();

    const matches: { start: number; end: number }[] = [];
    for (const term of queryTerms) {
      let index = textLower.indexOf(term);
      while (index !== -1) {
        matches.push({ start: index, end: index + term.length });
        index = textLower.indexOf(term, index + 1);
      }
    }

    matches.sort((a, b) => a.start - b.start);
    const merged: { start: number; end: number }[] = [];
    for (const match of matches) {
      if (merged.length === 0 || merged[merged.length - 1].end < match.start) {
        merged.push(match);
      } else {
        merged[merged.length - 1].end = Math.max(
          merged[merged.length - 1].end,
          match.end,
        );
      }
    }

    for (const match of merged) {
      if (match.start > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.slice(lastIndex, match.start)}
          </span>,
        );
      }
      parts.push(
        <mark
          key={`mark-${match.start}`}
          className={cn(colors.highlightBg, "font-normal")}
        >
          {text.slice(match.start, match.end)}
        </mark>,
      );
      lastIndex = match.end;
    }

    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>,
      );
    }

    return <>{parts}</>;
  };

  const totalRepos = searchIndex.getRepos().length;

  return (
    <div className={className}>
      {/* Search Bar */}
      <div className={cn("flex", spacing.inline)}>
        <Input
          placeholder="Search repositories and READMEs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn("flex-1", sizing.input, typography.textBase)}
          disabled={totalRepos === 0}
        />
        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value as SortOption)}
        >
          <SelectTrigger
            disabled={totalRepos === 0}
            className={cn(sizing.buttonSelect, sizing.select)}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevance</SelectItem>
            <SelectItem value="stars">Stars</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      {totalRepos > 0 && (
        <p className={cn(typography.textSm, colors.secondary)}>
          {results.length} result{results.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className={spacing.resultList}>
          {results.map((result) => (
            <div
              key={result.id}
              className={cn(
                spacing.result,
                "pb-8",
                effects.borderBottom,
                colors.border,
                "last:border-0",
              )}
            >
              <div>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "text-lg font-medium inline-block",
                    states.hoverUnderline,
                  )}
                >
                  {highlightText(result.fullName, query)}
                </a>
                {result.description && (
                  <p
                    className={cn(typography.textSm, colors.secondary, "mt-1")}
                  >
                    {highlightText(result.description, query)}
                  </p>
                )}
              </div>

              <div
                className={cn(
                  "flex flex-wrap",
                  spacing.inline,
                  typography.textXs,
                  colors.secondary,
                )}
              >
                {result.language && <span>{result.language}</span>}
                <span>★ {result.stars.toLocaleString()}</span>
                <span>{new Date(result.updatedAt).toLocaleDateString()}</span>
              </div>

              {result.matchedLines.length > 0 && (
                <div className={cn(spacing.gridTight, "mt-3")}>
                  {result.matchedLines.slice(0, 2).map((line, idx) => (
                    <p
                      key={idx}
                      className={cn(
                        typography.mono,
                        colors.secondary,
                        colors.bgMutedLight,
                        "p-2",
                        effects.roundedMd,
                      )}
                    >
                      {highlightText(line, query)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalRepos === 0 && (
        <p className={cn(typography.textSm, colors.secondary)}>
          No repositories indexed yet
        </p>
      )}
    </div>
  );
}
