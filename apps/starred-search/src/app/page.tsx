"use client";

import { useState, useMemo } from 'react';
import { IndexingUI } from '@/components/IndexingUI';
import { SearchUI } from '@/components/SearchUI';
import { SearchIndex } from '@/lib/search-index';
import { IndexedRepo } from '@/lib/github-indexer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Github, Info } from 'lucide-react';

export default function Home() {
  const [indexedRepos, setIndexedRepos] = useState<IndexedRepo[]>([]);
  
  const searchIndex = useMemo(() => {
    const index = new SearchIndex();
    index.setRepos(indexedRepos);
    return index;
  }, [indexedRepos]);

  const handleIndexingComplete = (repos: IndexedRepo[]) => {
    setIndexedRepos(repos);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <div className="flex items-center justify-center gap-3">
            <Github className="w-12 h-12" />
            <h1 className="text-4xl font-bold tracking-tight">
              GitHub README indexer
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Index and search through README files from any GitHub user's starred repositories.
            Perfect for discovering documentation and exploring interesting projects.
          </p>
        </div>

        {/* Rate Limit Warning */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>GitHub API rate limits</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li>Without token: 60 requests/hour (can index ~50 repos)</li>
              <li>With personal access token: 5,000 requests/hour</li>
              <li>
                Generate a token at{' '}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary"
                >
                  github.com/settings/tokens
                </a>
                {' '}(no scopes needed for public repos)
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Indexing UI */}
        <IndexingUI onIndexingComplete={handleIndexingComplete} />

        {/* Search UI */}
        <SearchUI searchIndex={searchIndex} />

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8 pb-4">
          <p>
            Built with Next.js, TypeScript, and shadcn/ui. All data is stored in-memory.
          </p>
        </div>
      </div>
    </div>
  );
}