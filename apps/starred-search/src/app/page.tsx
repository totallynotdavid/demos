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
import { spacing, sizing, typography, colors, effects, layout, states, cn } from '@/config/design-tokens';

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
    <div className={cn(layout.pageLayout, 'bg-gradient-to-b from-background via-background to-muted/20')}>
      {/* Header with Theme Toggle */}
      <header className={cn('sticky top-0 z-50', effects.backdropBlurStrong, 'bg-background/80', effects.borderBottom, colors.borderLight)}>
        <div className={cn(layout.container, layout.containerPadding, 'h-16', layout.flexBetween)}>
          <div className={cn(layout.flexRow, spacing.inline)}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-foreground to-foreground/60 flex items-center justify-center">
              <Github className="w-4 h-4 text-background" />
            </div>
            <span className="text-lg font-medium tracking-tight">GitHub Insights</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className={cn('flex-1', layout.container, layout.containerPadding, 'py-12', spacing.major)}>
        {/* Hero Section */}
        <div className={cn(spacing.gridMedium, 'text-center py-8')}>
          <h1 className={cn(typography.h1, 'bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent')}>
            Discover Your GitHub Activity
          </h1>
          <p className={typography.subtitle}>
            Index starred repositories, analyze contribution patterns, and export comprehensive data.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className={layout.flexCenter}>
          <div className={cn('inline-flex items-center p-1', effects.roundedFull, colors.bgMuted, effects.backdropBlur, effects.border, colors.borderLight, spacing.gridTight)}>
            <button
              onClick={() => setActiveSection('starred')}
              className={cn(
                'px-6 py-2.5', effects.roundedFull, typography.textSm, 'font-medium', effects.transition,
                activeSection === 'starred'
                  ? cn('bg-background', colors.primary, effects.shadow)
                  : cn(colors.secondary, states.hover)
              )}
            >
              Starred Repos
            </button>
            <button
              onClick={() => setActiveSection('activity')}
              className={cn(
                'px-6 py-2.5', effects.roundedFull, typography.textSm, 'font-medium', effects.transition,
                activeSection === 'activity'
                  ? cn('bg-background', colors.primary, effects.shadow)
                  : cn(colors.secondary, states.hover)
              )}
            >
              Activity Analysis
            </button>
          </div>
        </div>

        {/* Content Sections */}
        <div className="pb-8">
          {activeSection === 'starred' && (
            <div className={cn(spacing.major, 'animate-in fade-in duration-500')}>
              <div className={cn(layout.card, 'p-6 sm:p-8')}>
                <IndexingUI onIndexingComplete={handleIndexingComplete} className={spacing.section} />
              </div>
              
              {indexedRepos.length > 0 && (
                <>
                  <div className={cn(layout.card, 'p-6 sm:p-8')}>
                    <SearchUI searchIndex={searchIndex} className={spacing.section} />
                  </div>
                  <div className={cn(layout.card, 'p-6 sm:p-8')}>
                    <ExportUI repos={indexedRepos} className={spacing.form} />
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === 'activity' && (
            <div className={cn(spacing.major, 'animate-in fade-in duration-500')}>
              <div className={cn(layout.card, 'p-6 sm:p-8')}>
                <ActivityAnalysisUI className={spacing.major} />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className={cn(effects.borderTop, colors.borderLight, colors.bgMutedLight, effects.backdropBlur, 'mt-auto')}>
        <div className={cn(layout.container, layout.containerPadding, 'py-6')}>
          <p className={cn(typography.textXs, 'text-center text-muted-foreground/80')}>
            Rate limits: 60 requests/hour without token, 5,000 with token.{' '}
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className={cn('underline underline-offset-2', states.hover, effects.transitionColors)}
            >
              Get a personal access token
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}