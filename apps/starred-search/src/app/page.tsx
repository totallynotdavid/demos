"use client";

import { useState, useMemo } from 'react';
import { IndexingUI } from '@/components/IndexingUI';
import { SearchUI } from '@/components/SearchUI';
import { ExportUI } from '@/components/ExportUI';
import { ActivityAnalysisUI } from '@/components/ActivityAnalysisUI';
import { SearchIndex } from '@/lib/search-index';
import { IndexedRepo } from '@/lib/github-indexer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Github, Info, Star, Download, TrendingUp } from 'lucide-react';

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
              GitHub Insights
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover patterns in your GitHub activity, search through starred repositories, and export data for analysis.
          </p>
        </div>

        {/* Rate Limit Warning */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>GitHub API rate limits</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li>Without token: 60 requests/hour (limited data access)</li>
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

        {/* Tabs Navigation */}
        <Tabs defaultValue="starred" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="starred" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              <span className="hidden sm:inline">Starred repos</span>
              <span className="sm:hidden">Starred</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
              <span className="sm:hidden">Export</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Activity</span>
              <span className="sm:hidden">Activity</span>
            </TabsTrigger>
          </TabsList>

          {/* Starred Repos Tab */}
          <TabsContent value="starred" className="space-y-6 mt-6">
            <IndexingUI onIndexingComplete={handleIndexingComplete} />
            <SearchUI searchIndex={searchIndex} />
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-6 mt-6">
            <ExportUI repos={indexedRepos} />
          </TabsContent>

          {/* Activity Analysis Tab */}
          <TabsContent value="activity" className="space-y-6 mt-6">
            <ActivityAnalysisUI />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8 pb-4">
          <p>
            Built with Next.js, TypeScript, and shadcn/ui.
          </p>
        </div>
      </div>
    </div>
  );
}