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
  id: string;
  type: string;
  actor: {
    id: number;
    login: string;
    display_login: string;
    url: string;
    avatar_url: string;
  };
  repo: {
    id: number;
    name: string;
    url: string;
  };
  payload: any;
  public: boolean;
  created_at: string;
  org?: {
    id: number;
    login: string;
    url: string;
    avatar_url: string;
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
      'Accept': 'application/vnd.github+json',
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

    try {
      // Use GitHub Events API - simpler and more reliable
      // Note: This API returns max 300 events and only last 90 days
      while (page <= 10) {
        const url = `${this.baseUrl}/users/${username}/events/public?per_page=${perPage}&page=${page}`;
        
        const response = await fetch(url, {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = await response.text();
          }

          console.error('GitHub API Error:', {
            status: response.status,
            statusText: response.statusText,
            url: url,
            body: errorData
          });

          if (response.status === 404) {
            throw new Error(`User not found: ${username}`);
          }
          if (response.status === 403) {
            throw new Error(`GitHub API rate limit exceeded`);
          }
          throw new Error(`Failed to fetch activity (${response.status}): ${JSON.stringify(errorData)}`);
        }

        const events: GitHubEvent[] = await response.json();

        if (events.length === 0) {
          break;
        }

        // Process PushEvents (commits)
        for (const event of events) {
          if (event.type === 'PushEvent') {
            const timestamp = new Date(event.created_at);
            
            // Filter by time range
            if (timestamp < threshold) {
              continue;
            }

            // Count the push event as one commit activity
            // (We could parse payload.commits for individual commits, but this is simpler)
            commits.push({
              repo: event.repo.name,
              timestamp,
              hour: timestamp.getHours(),
              dayOfWeek: timestamp.getDay(),
              sha: event.payload.head || event.id,
              message: `Push to ${event.payload.ref || 'branch'}`,
            });
          }
        }

        onProgress?.(page, 10);

        // If we got fewer results than requested, we've reached the end
        if (events.length < perPage) {
          break;
        }

        page++;
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
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