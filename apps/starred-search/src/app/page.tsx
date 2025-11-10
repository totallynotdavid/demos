"use client";

import { useState, useMemo } from 'react';
import { IndexingUI } from '@/components/IndexingUI';
import { SearchUI } from '@/components/SearchUI';
import { ExportUI } from '@/components/ExportUI';
import { ActivityAnalysisUI } from '@/components/ActivityAnalysisUI';
import { SearchIndex } from '@/lib/search-index';
import { IndexedRepo } from '@/lib/github-indexer';
import { ThemeToggle } from '@/components/theme-toggle';
import { Github } from 'lucide-react';

export default function Home() {
  const [indexedRepos, setIndexedRepos] = useState<IndexedRepo[]>([]);
  const [activeSection, setActiveSection] = useState<'starred' | 'activity'>('starred');
  
  const searchIndex = useMemo(() => {
    const index = new SearchIndex();
    index.setRepos(indexedRepos);
    return index;
  }, [indexedRepos]);

  const handleIndexingComplete = (repos: IndexedRepo[]) => {
    setIndexedRepos(repos);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header with Theme Toggle */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-foreground to-foreground/60 flex items-center justify-center">
              <Github className="w-4 h-4 text-background" />
            </div>
            <span className="text-lg font-medium tracking-tight">GitHub Insights</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Hero Section */}
        <div className="space-y-4 text-center py-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            Discover Your GitHub Activity
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-light">
            Index starred repositories, analyze contribution patterns, and export comprehensive data.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 p-1 rounded-full bg-muted/50 backdrop-blur-sm border border-border/40">
            <button
              onClick={() => setActiveSection('starred')}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeSection === 'starred'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Starred Repos
            </button>
            <button
              onClick={() => setActiveSection('activity')}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeSection === 'activity'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Activity Analysis
            </button>
          </div>
        </div>

        {/* Content Sections */}
        <div className="pb-8">
          {activeSection === 'starred' && (
            <div className="space-y-12 animate-in fade-in duration-500">
              <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/40 p-6 sm:p-8 shadow-sm">
                <IndexingUI onIndexingComplete={handleIndexingComplete} />
              </div>
              
              {indexedRepos.length > 0 && (
                <>
                  <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/40 p-6 sm:p-8 shadow-sm">
                    <SearchUI searchIndex={searchIndex} />
                  </div>
                  <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/40 p-6 sm:p-8 shadow-sm">
                    <ExportUI repos={indexedRepos} />
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === 'activity' && (
            <div className="space-y-12 animate-in fade-in duration-500">
              <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/40 p-6 sm:p-8 shadow-sm">
                <ActivityAnalysisUI />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/30 backdrop-blur-sm mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-xs text-center text-muted-foreground/80">
            Rate limits: 60 requests/hour without token, 5,000 with token.{' '}
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Get a personal access token
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}