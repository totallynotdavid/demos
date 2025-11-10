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

interface GitHubSearchCommitResponse {
  total_count: number;
  incomplete_results: boolean;
  items: Array<{
    sha: string;
    commit: {
      author: {
        name: string;
        email: string;
        date: string;
      };
      committer: {
        name: string;
        email: string;
        date: string;
      };
      message: string;
    };
    repository: {
      name: string;
      full_name: string;
    };
  }>;
}

export class GitHubActivityFetcher {
  private baseUrl = 'https://api.github.com';
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github+json', // Use stable API, not preview
      'X-GitHub-Api-Version': '2022-11-28',
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

  private formatDateForSearch(date: Date): string {
    return date.toISOString().split('T')[0];
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
      // Use GitHub Search API for commits
      const dateQuery = this.formatDateForSearch(threshold);
      
      while (hasMore && page <= 10) {
        const query = `author:${username}+committer-date:>${dateQuery}`;
        const url = `${this.baseUrl}/search/commits?q=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&sort=committer-date&order=desc`;
        
        const response = await fetch(url, {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('User not found');
          }
          if (response.status === 403) {
            const rateLimitReset = response.headers.get('X-RateLimit-Reset');
            throw new Error('GitHub API rate limit exceeded. Please provide a Personal Access Token.');
          }
          if (response.status === 422) {
            throw new Error('Invalid username or search query');
          }
          throw new Error(`Failed to fetch commit activity: ${response.statusText}`);
        }

        const data: GitHubSearchCommitResponse = await response.json();

        if (data.items.length === 0) {
          hasMore = false;
          break;
        }

        for (const item of data.items) {
          const timestamp = new Date(item.commit.committer.date);
          
          commits.push({
            repo: item.repository.full_name,
            timestamp,
            hour: timestamp.getHours(),
            dayOfWeek: timestamp.getDay(),
            sha: item.sha,
            message: item.commit.message.split('\n')[0], // First line only
          });
        }

        onProgress?.(page, Math.ceil(data.total_count / perPage));

        // If we got fewer results than requested, we've reached the end
        if (data.items.length < perPage) {
          hasMore = false;
        }

        // GitHub Search API has a max of 1000 results (10 pages)
        if (page * perPage >= 1000) {
          hasMore = false;
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