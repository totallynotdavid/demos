"use client";

import { useState } from 'react';
import { GitHubIndexer, IndexingProgress } from '@/lib/github-indexer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Index GitHub starred repositories
        </CardTitle>
        <CardDescription>
          Enter a GitHub username to index all README files from their starred repositories
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">GitHub username</Label>
          <Input
            id="username"
            placeholder="octocat"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isIndexing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="token">
            Personal access token (optional)
          </Label>
          <Input
            id="token"
            type="password"
            placeholder="ghp_xxxxxxxxxxxx"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={isIndexing}
          />
          <p className="text-xs text-muted-foreground">
            Increases rate limit from 60 to 5000 requests/hour
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {progress && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} />
            
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Repos: {progress.fetchedRepos}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Indexed: {progress.indexedReadmes}</span>
              </div>
              {progress.errors > 0 && (
                <div className="flex items-center gap-2 text-sm col-span-2">
                  <XCircle className="w-4 h-4 text-orange-600" />
                  <span>Errors: {progress.errors}</span>
                </div>
              )}
            </div>

            {progress.isComplete && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Indexing complete! Indexed {progress.indexedReadmes} READMEs from {progress.fetchedRepos} starred repositories.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {!isIndexing ? (
            <Button onClick={handleStartIndexing} className="w-full">
              <Search className="w-4 h-4 mr-2" />
              Start indexing
            </Button>
          ) : (
            <Button onClick={handleStopIndexing} variant="destructive" className="w-full">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Stop indexing
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}