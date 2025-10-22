"use client";

import { useState, useMemo } from 'react';
import { SearchIndex, SearchResult, SortOption } from '@/lib/search-index';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Star, Calendar, ExternalLink, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

    // Find all matches
    const matches: { start: number; end: number }[] = [];
    for (const term of queryTerms) {
      let index = textLower.indexOf(term);
      while (index !== -1) {
        matches.push({ start: index, end: index + term.length });
        index = textLower.indexOf(term, index + 1);
      }
    }

    // Sort and merge overlapping matches
    matches.sort((a, b) => a.start - b.start);
    const merged: { start: number; end: number }[] = [];
    for (const match of matches) {
      if (merged.length === 0 || merged[merged.length - 1].end < match.start) {
        merged.push(match);
      } else {
        merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, match.end);
      }
    }

    // Build highlighted text
    for (const match of merged) {
      if (match.start > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, match.start)}</span>);
      }
      parts.push(
        <mark key={`mark-${match.start}`} className="bg-yellow-200 dark:bg-yellow-700 font-semibold">
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
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Search indexed READMEs
          </CardTitle>
          <CardDescription>
            {totalRepos > 0
              ? `Search across ${totalRepos} indexed repositories`
              : 'Index repositories first to enable search'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-col sm:flex-row">
            <div className="flex-1 space-y-2">
              <Label htmlFor="search">Search query</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search READMEs, repo names, descriptions..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                  disabled={totalRepos === 0}
                />
              </div>
            </div>

            <div className="space-y-2 sm:w-40">
              <Label htmlFor="sort">Sort by</Label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger id="sort" disabled={totalRepos === 0}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="stars">Stars</SelectItem>
                  <SelectItem value="updated">Recently updated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {totalRepos === 0 && (
            <Alert>
              <AlertDescription>
                No repositories indexed yet. Use the indexing tool above to get started.
              </AlertDescription>
            </Alert>
          )}

          {totalRepos > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
              <span>
                {results.length} {results.length === 1 ? 'result' : 'results'}
                {query && ` for "${query}"`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {totalRepos > 0 && results.length > 0 && (
        <div className="space-y-3">
          {results.map((result) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-center gap-1 truncate"
                      >
                        {highlightText(result.fullName, query)}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </CardTitle>
                    {result.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {highlightText(result.description, query)}
                      </CardDescription>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center mt-2">
                  {result.language && (
                    <Badge variant="secondary" className="text-xs">
                      {result.language}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {result.stars.toLocaleString()}
                  </Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(result.updatedAt).toLocaleDateString()}
                  </Badge>
                  {sortBy === 'relevance' && query && (
                    <Badge variant="outline" className="text-xs">
                      Score: {result.score}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              {result.matchedLines.length > 0 && (
                <CardContent className="pt-0">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {result.matchedLines.map((line, idx) => (
                      <div
                        key={idx}
                        className="bg-muted/50 p-2 rounded font-mono text-xs truncate"
                      >
                        {highlightText(line, query)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}