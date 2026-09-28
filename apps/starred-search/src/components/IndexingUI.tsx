import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  cn,
  colors,
  effects,
  sizing,
  spacing,
  typography,
} from "@/config/design-tokens";
import {
  GitHubIndexer,
  type IndexedRepo,
  type IndexingProgress,
} from "@/lib/github-indexer";

interface IndexingUIProps {
  onIndexingComplete: (repos: IndexedRepo[]) => void;
  className?: string;
}

export function IndexingUI({ onIndexingComplete, className }: IndexingUIProps) {
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [isIndexing, setIsIndexing] = useState(false);
  const [progress, setProgress] = useState<IndexingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [indexer, setIndexer] = useState<GitHubIndexer | null>(null);

  const handleStartIndexing = async () => {
    if (!username.trim()) {
      setError("Please enter a GitHub username");
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
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during indexing",
      );
    } finally {
      setIsIndexing(false);
      setIndexer(null);
    }
  };

  const handleStopIndexing = () => {
    if (indexer) {
      indexer.abort();
      setIsIndexing(false);
      setError("Indexing stopped by user");
    }
  };

  const progressPercentage = progress
    ? progress.totalRepos > 0
      ? Math.round((progress.indexedReadmes / progress.totalRepos) * 100)
      : 0
    : 0;

  return (
    <div className={className}>
      {/* Form */}
      <div className={spacing.form}>
        <div className={cn("flex", spacing.inline)}>
          <Input
            placeholder="GitHub username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isIndexing}
            className={cn("flex-1", sizing.input, typography.textBase)}
            onKeyDown={(e) =>
              e.key === "Enter" && !isIndexing && handleStartIndexing()
            }
          />
          <Input
            type="password"
            placeholder="Token (optional)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={isIndexing}
            className={cn("flex-1", sizing.input, typography.textBase)}
            onKeyDown={(e) =>
              e.key === "Enter" && !isIndexing && handleStartIndexing()
            }
          />
          {!isIndexing ? (
            <Button
              onClick={handleStartIndexing}
              className={cn(sizing.input, sizing.buttonNormal)}
            >
              Index
            </Button>
          ) : (
            <Button
              onClick={handleStopIndexing}
              variant="ghost"
              className={cn(sizing.input, sizing.buttonNormal)}
            >
              Cancel
            </Button>
          )}
        </div>

        {error && (
          <p className={cn(typography.textSm, colors.destructive)}>{error}</p>
        )}
      </div>

      {/* Progress */}
      {progress && (
        <div className={spacing.gridMedium}>
          <div className={spacing.gridTight}>
            <div
              className={cn(
                "flex items-baseline justify-between",
                typography.textSm,
              )}
            >
              <span className={colors.secondary}>
                {progress.isComplete ? "Complete" : "Indexing..."}
              </span>
              <span className="font-medium tabular-nums">
                {progress.indexedReadmes} / {progress.fetchedRepos}
              </span>
            </div>
            <div
              className={cn(
                sizing.progressHeight,
                colors.bgMuted,
                effects.roundedFull,
                "overflow-hidden",
              )}
            >
              <div
                className={cn(
                  sizing.progressHeight,
                  colors.progressBar,
                  effects.transitionWidth,
                )}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {progress.errors > 0 && (
            <p className={cn(typography.textXs, colors.secondary)}>
              {progress.errors} error{progress.errors > 1 ? "s" : ""} during
              indexing
            </p>
          )}

          {progress.isComplete && (
            <p className={cn(typography.textSm, colors.secondary)}>
              Indexed {progress.indexedReadmes} README
              {progress.indexedReadmes !== 1 ? "s" : ""} from{" "}
              {progress.fetchedRepos} repositories
            </p>
          )}
        </div>
      )}
    </div>
  );
}
