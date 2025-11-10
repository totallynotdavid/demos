"use client";

import { useState, useMemo } from 'react';
import { SearchIndex, SearchResult, SortOption } from '@/lib/search-index';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SearchUIProps {
  searchIndex: SearchIndex;
}

export function SearchUI({ searchIndex }: SearchUIProps) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  const results = useMemo(() => {
    return searchIndex.search(query, sortBy);
  }, [query, sortBy, searchIndex]);

  const highlightText = (text: string, query: string): JSX.Element => {
    if (!query.trim()) {
      return <>{text}</>;
    }

    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    const parts: JSX.Element[] = [];
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
        merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, match.end);
      }
    }

    for (const match of merged) {
      if (match.start > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, match.start)}</span>);
      }
      parts.push(
        <mark key={`mark-${match.start}`} className="bg-foreground/10 font-normal">
          {text.slice(match.start, match.end)}
        </mark>
      );
      lastIndex = match.end;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
    }

    return <>{parts}</>;
  };

  const totalRepos = searchIndex.getRepos().length;

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="flex gap-3">
        <Input
          placeholder="Search repositories and READMEs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 h-11 text-base"
          disabled={totalRepos === 0}
        />
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger disabled={totalRepos === 0} className="w-40 h-11">
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
        <p className="text-sm text-muted-foreground">
          {results.length} result{results.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-8">
          {results.map((result) => (
            <div key={result.id} className="space-y-3 pb-8 border-b border-border/50 last:border-0">
              <div>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-medium hover:underline inline-block"
                >
                  {highlightText(result.fullName, query)}
                </a>
                {result.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {highlightText(result.description, query)}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {result.language && <span>{result.language}</span>}
                <span>★ {result.stars.toLocaleString()}</span>
                <span>{new Date(result.updatedAt).toLocaleDateString()}</span>
              </div>

              {result.matchedLines.length > 0 && (
                <div className="space-y-1.5 mt-3">
                  {result.matchedLines.slice(0, 2).map((line, idx) => (
                    <p
                      key={idx}
                      className="text-xs font-mono text-muted-foreground bg-muted/30 p-2 rounded"
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
        <p className="text-sm text-muted-foreground">
          No repositories indexed yet
        </p>
      )}
    </div>
  );
}