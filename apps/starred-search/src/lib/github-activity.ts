export interface CommitActivity {
  repo: string;
  timestamp: Date;
  hour: number;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  sha: string;
  message: string;
}

export interface ActivityStats {
  totalCommits: number;
  repoActivity: Map<string, number>;
  hourlyActivity: Map<number, number>; // 0-23
  dailyActivity: Map<number, number>; // 0-6 (Sun-Sat)
  commits: CommitActivity[];
}

export type TimeRange = '3days' | '1week' | '1month' | '3months' | '6months';

interface GitHubEvent {
  type: string;
  repo: {
    name: string;
  };
  created_at: string;
  payload: {
    commits?: Array<{
      sha: string;
      message: string;
    }>;
  };
}

export class GitHubActivityFetcher {
  private baseUrl = 'https://api.github.com';
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }
    return headers;
  }

  private getDateThreshold(timeRange: TimeRange): Date {
    const now = new Date();
    const threshold = new Date(now);

    switch (timeRange) {
      case '3days':
        threshold.setDate(now.getDate() - 3);
        break;
      case '1week':
        threshold.setDate(now.getDate() - 7);
        break;
      case '1month':
        threshold.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        threshold.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        threshold.setMonth(now.getMonth() - 6);
        break;
    }

    return threshold;
  }

  async fetchUserActivity(
    username: string,
    timeRange: TimeRange,
    onProgress?: (processed: number, total: number) => void
  ): Promise<ActivityStats> {
    const threshold = this.getDateThreshold(timeRange);
    const commits: CommitActivity[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    try {
      // Fetch user events (GitHub API only provides last 90 days of events, max 300 events)
      while (hasMore && page <= 10) {
        const url = `${this.baseUrl}/users/${username}/events?per_page=${perPage}&page=${page}`;
        const response = await fetch(url, {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('User not found');
          }
          if (response.status === 403) {
            throw new Error('GitHub API rate limit exceeded. Please provide a Personal Access Token.');
          }
          throw new Error(`Failed to fetch user activity: ${response.statusText}`);
        }

        const events: GitHubEvent[] = await response.json();

        if (events.length === 0) {
          hasMore = false;
          break;
        }

        for (const event of events) {
          const eventDate = new Date(event.created_at);

          // Stop if we've gone past the threshold
          if (eventDate < threshold) {
            hasMore = false;
            break;
          }

          // Only process PushEvents (commits)
          if (event.type === 'PushEvent' && event.payload.commits) {
            for (const commit of event.payload.commits) {
              const timestamp = new Date(event.created_at);
              commits.push({
                repo: event.repo.name,
                timestamp,
                hour: timestamp.getHours(),
                dayOfWeek: timestamp.getDay(),
                sha: commit.sha,
                message: commit.message,
              });
            }
          }
        }

        onProgress?.(page, 10);

        if (events.length < perPage) {
          hasMore = false;
        }

        page++;
      }

      // Calculate statistics
      const stats: ActivityStats = {
        totalCommits: commits.length,
        repoActivity: new Map(),
        hourlyActivity: new Map(),
        dailyActivity: new Map(),
        commits,
      };

      // Initialize hourly activity (0-23)
      for (let i = 0; i < 24; i++) {
        stats.hourlyActivity.set(i, 0);
      }

      // Initialize daily activity (0-6, Sun-Sat)
      for (let i = 0; i < 7; i++) {
        stats.dailyActivity.set(i, 0);
      }

      // Calculate stats
      for (const commit of commits) {
        // Repo activity
        const repoCount = stats.repoActivity.get(commit.repo) || 0;
        stats.repoActivity.set(commit.repo, repoCount + 1);

        // Hourly activity
        const hourCount = stats.hourlyActivity.get(commit.hour) || 0;
        stats.hourlyActivity.set(commit.hour, hourCount + 1);

        // Daily activity
        const dayCount = stats.dailyActivity.get(commit.dayOfWeek) || 0;
        stats.dailyActivity.set(commit.dayOfWeek, dayCount + 1);
      }

      return stats;
    } catch (error) {
      throw error;
    }
  }
}
