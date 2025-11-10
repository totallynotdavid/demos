"use client";

import { useState } from 'react';
import { GitHubIndexer, IndexingProgress } from '@/lib/github-indexer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IndexedRepo } from '@/lib/github-indexer';

interface IndexingUIProps {
  onIndexingComplete: (repos: IndexedRepo[]) => void;
}

export function IndexingUI({ onIndexingComplete }: IndexingUIProps) {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [isIndexing, setIsIndexing] = useState(false);
  const [progress, setProgress] = useState<IndexingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [indexer, setIndexer] = useState<GitHubIndexer | null>(null);

  const handleStartIndexing = async () => {
    if (!username.trim()) {
      setError('Please enter a GitHub username');
      return;
    }

    setError(null);
    setIsIndexing(true);
    setProgress({
      totalRepos: 0,
      fetchedRepos: 0,
      indexedReadmes: 0,
      errors: 0,
      errorMessages: [],
      isComplete: false,
    });

    const newIndexer = new GitHubIndexer(token || undefined);
    setIndexer(newIndexer);

    try {
      const repos = await newIndexer.fetchStarredRepos(username, (p) => {
        setProgress(p);
      });
      
      onIndexingComplete(repos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during indexing');
    } finally {
      setIsIndexing(false);
      setIndexer(null);
    }
  };

  const handleStopIndexing = () => {
    if (indexer) {
      indexer.abort();
      setIsIndexing(false);
      setError('Indexing stopped by user');
    }
  };

  const progressPercentage = progress
    ? progress.totalRepos > 0
      ? Math.round((progress.indexedReadmes / progress.totalRepos) * 100)
      : 0
    : 0;

  return (
    <div className="space-y-8">
      {/* Simple Form */}
      <div className="space-y-6">
        <div className="flex gap-3">
          <Input
            placeholder="GitHub username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isIndexing}
            className="flex-1 h-11 text-base"
            onKeyDown={(e) => e.key === 'Enter' && !isIndexing && handleStartIndexing()}
          />
          <Input
            type="password"
            placeholder="Token (optional)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={isIndexing}
            className="flex-1 h-11 text-base"
            onKeyDown={(e) => e.key === 'Enter' && !isIndexing && handleStartIndexing()}
          />
          {!isIndexing ? (
            <Button onClick={handleStartIndexing} className="h-11 px-8">
              Index
            </Button>
          ) : (
            <Button onClick={handleStopIndexing} variant="ghost" className="h-11 px-8">
              Cancel
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Progress */}
      {progress && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">
                {progress.isComplete ? 'Complete' : 'Indexing...'}
              </span>
              <span className="font-medium tabular-nums">
                {progress.indexedReadmes} / {progress.fetchedRepos}
              </span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-foreground transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
          
          {progress.errors > 0 && (
            <p className="text-xs text-muted-foreground">
              {progress.errors} error{progress.errors > 1 ? 's' : ''} during indexing
            </p>
          )}

          {progress.isComplete && (
            <p className="text-sm text-muted-foreground">
              Indexed {progress.indexedReadmes} README{progress.indexedReadmes !== 1 ? 's' : ''} from {progress.fetchedRepos} repositories
            </p>
          )}
        </div>
      )}
    </div>
  );
}