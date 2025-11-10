"use client";

import { useState, useMemo } from 'react';
import { IndexingUI } from '@/components/IndexingUI';
import { SearchUI } from '@/components/SearchUI';
import { ExportUI } from '@/components/ExportUI';
import { ActivityAnalysisUI } from '@/components/ActivityAnalysisUI';
import { SearchIndex } from '@/lib/search-index';
import { IndexedRepo } from '@/lib/github-indexer';

export default function Home() {
  const [indexedRepos, setIndexedRepos] = useState<IndexedRepo[]>([]);
  const [activeSection, setActiveSection] = useState<'starred' | 'activity' | null>(null);
  
  const searchIndex = useMemo(() => {
    const index = new SearchIndex();
    index.setRepos(indexedRepos);
    return index;
  }, [indexedRepos]);

  const handleIndexingComplete = (repos: IndexedRepo[]) => {
    setIndexedRepos(repos);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-16">
        {/* Minimal Header */}
        <div className="space-y-3">
          <h1 className="text-5xl font-light tracking-tight">
            GitHub Insights
          </h1>
          <p className="text-lg text-muted-foreground font-light max-w-2xl">
            Index your starred repositories, analyze activity patterns, and export data.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-8 border-b border-border/50">
          <button
            onClick={() => setActiveSection('starred')}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeSection === 'starred'
                ? 'border-b-2 border-foreground text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Starred Repositories
          </button>
          <button
            onClick={() => setActiveSection('activity')}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeSection === 'activity'
                ? 'border-b-2 border-foreground text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Activity Analysis
          </button>
        </div>

        {/* Starred Section */}
        {(activeSection === 'starred' || activeSection === null) && (
          <div className="space-y-12">
            <IndexingUI onIndexingComplete={handleIndexingComplete} />
            
            {indexedRepos.length > 0 && (
              <>
                <SearchUI searchIndex={searchIndex} />
                <ExportUI repos={indexedRepos} />
              </>
            )}
          </div>
        )}

        {/* Activity Section */}
        {activeSection === 'activity' && (
          <ActivityAnalysisUI />
        )}

        {/* Footer Note */}
        <div className="pt-16 text-xs text-muted-foreground/60 font-light">
          Rate limits: 60 requests/hour without token, 5,000 with token.{' '}
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Get token
          </a>
        </div>
      </div>
    </div>
  );
}