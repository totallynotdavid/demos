export interface CommitActivity {
  repo: string;
  timestamp: Date;
  hour: number;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  sha: string;
  message: string;
}

export interface IssueActivity {
  repo: string;
  timestamp: Date;
  action: 'opened' | 'closed' | 'reopened';
  number: number;
  title: string;
}

export interface PullRequestActivity {
  repo: string;
  timestamp: Date;
  action: 'opened' | 'closed' | 'merged';
  number: number;
  title: string;
}

export interface CommentActivity {
  repo: string;
  timestamp: Date;
  type: 'issue' | 'pr' | 'commit';
  target: string;
}

export interface ReviewActivity {
  repo: string;
  timestamp: Date;
  prNumber: number;
  state: 'approved' | 'changes_requested' | 'commented';
}

export interface ActivityStats {
  totalCommits: number;
  totalIssues: number;
  totalPRs: number;
  totalComments: number;
  totalReviews: number;
  repoActivity: Map<string, number>;
  hourlyActivity: Map<number, number>; // 0-23
  dailyActivity: Map<number, number>; // 0-6 (Sun-Sat)
  commits: CommitActivity[];
  issues: IssueActivity[];
  pullRequests: PullRequestActivity[];
  comments: CommentActivity[];
  reviews: ReviewActivity[];
  uniqueRepos: Set<string>;
  collaborationRepos: Set<string>; // Repos where they commented/reviewed but didn't commit
  languages: Map<string, number>;
  timeRangeDays: number;
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

  private getDaysInRange(timeRange: TimeRange): number {
    switch (timeRange) {
      case '3days': return 3;
      case '1week': return 7;
      case '1month': return 30;
      case '3months': return 90;
      case '6months': return 180;
    }
  }

  async fetchUserActivity(
    username: string,
    timeRange: TimeRange,
    onProgress?: (processed: number, total: number) => void
  ): Promise<ActivityStats> {
    const threshold = this.getDateThreshold(timeRange);
    const commits: CommitActivity[] = [];
    const issues: IssueActivity[] = [];
    const pullRequests: PullRequestActivity[] = [];
    const comments: CommentActivity[] = [];
    const reviews: ReviewActivity[] = [];
    const uniqueRepos = new Set<string>();
    const commitRepos = new Set<string>();
    const languages = new Map<string, number>();
    
    let page = 1;
    const perPage = 100;

    try {
      // Fetch events from GitHub API
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

        // Process all event types
        for (const event of events) {
          const timestamp = new Date(event.created_at);
          
          // Filter by time range
          if (timestamp < threshold) {
            continue;
          }

          uniqueRepos.add(event.repo.name);

          // PushEvent - commits
          if (event.type === 'PushEvent') {
            commitRepos.add(event.repo.name);
            const commitCount = event.payload.commits?.length || 1;
            for (let i = 0; i < commitCount; i++) {
              commits.push({
                repo: event.repo.name,
                timestamp,
                hour: timestamp.getHours(),
                dayOfWeek: timestamp.getDay(),
                sha: event.payload.head || event.id,
                message: event.payload.commits?.[i]?.message || `Push to ${event.payload.ref}`,
              });
            }
          }

          // IssuesEvent - issue creation/closing
          if (event.type === 'IssuesEvent') {
            issues.push({
              repo: event.repo.name,
              timestamp,
              action: event.payload.action as 'opened' | 'closed' | 'reopened',
              number: event.payload.issue?.number,
              title: event.payload.issue?.title || 'Issue',
            });
          }

          // PullRequestEvent - PR creation/closing/merging
          if (event.type === 'PullRequestEvent') {
            pullRequests.push({
              repo: event.repo.name,
              timestamp,
              action: event.payload.action === 'closed' && event.payload.pull_request?.merged 
                ? 'merged' 
                : event.payload.action as 'opened' | 'closed',
              number: event.payload.pull_request?.number,
              title: event.payload.pull_request?.title || 'Pull Request',
            });
          }

          // IssueCommentEvent - comments on issues
          if (event.type === 'IssueCommentEvent') {
            comments.push({
              repo: event.repo.name,
              timestamp,
              type: event.payload.issue?.pull_request ? 'pr' : 'issue',
              target: `#${event.payload.issue?.number}`,
            });
          }

          // PullRequestReviewEvent - PR reviews
          if (event.type === 'PullRequestReviewEvent') {
            reviews.push({
              repo: event.repo.name,
              timestamp,
              prNumber: event.payload.pull_request?.number,
              state: event.payload.review?.state?.toLowerCase() as 'approved' | 'changes_requested' | 'commented',
            });
          }

          // PullRequestReviewCommentEvent - comments on PR code
          if (event.type === 'PullRequestReviewCommentEvent') {
            comments.push({
              repo: event.repo.name,
              timestamp,
              type: 'pr',
              target: `#${event.payload.pull_request?.number}`,
            });
          }

          // CommitCommentEvent - comments on commits
          if (event.type === 'CommitCommentEvent') {
            comments.push({
              repo: event.repo.name,
              timestamp,
              type: 'commit',
              target: event.payload.comment?.commit_id?.substring(0, 7) || 'commit',
            });
          }
        }

        onProgress?.(page, 10);

        if (events.length < perPage) {
          break;
        }

        page++;
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Fetch language data for active repos
      const repoLanguages = await this.fetchRepoLanguages(Array.from(uniqueRepos).slice(0, 20));
      for (const [lang, count] of repoLanguages.entries()) {
        languages.set(lang, count);
      }

      // Calculate collaboration repos (repos where they interacted but didn't commit)
      const collaborationRepos = new Set<string>();
      for (const repo of uniqueRepos) {
        if (!commitRepos.has(repo)) {
          collaborationRepos.add(repo);
        }
      }

      // Calculate statistics
      const stats: ActivityStats = {
        totalCommits: commits.length,
        totalIssues: issues.length,
        totalPRs: pullRequests.length,
        totalComments: comments.length,
        totalReviews: reviews.length,
        repoActivity: new Map(),
        hourlyActivity: new Map(),
        dailyActivity: new Map(),
        commits,
        issues,
        pullRequests,
        comments,
        reviews,
        uniqueRepos,
        collaborationRepos,
        languages,
        timeRangeDays: this.getDaysInRange(timeRange),
      };

      // Initialize hourly activity (0-23)
      for (let i = 0; i < 24; i++) {
        stats.hourlyActivity.set(i, 0);
      }

      // Initialize daily activity (0-6, Sun-Sat)
      for (let i = 0; i < 7; i++) {
        stats.dailyActivity.set(i, 0);
      }

      // Calculate stats - count all activities, not just commits
      const allActivities = [
        ...commits.map(c => ({ repo: c.repo, hour: c.hour, day: c.dayOfWeek })),
        ...issues.map(i => ({ repo: i.repo, hour: i.timestamp.getHours(), day: i.timestamp.getDay() })),
        ...pullRequests.map(p => ({ repo: p.repo, hour: p.timestamp.getHours(), day: p.timestamp.getDay() })),
        ...comments.map(c => ({ repo: c.repo, hour: c.timestamp.getHours(), day: c.timestamp.getDay() })),
        ...reviews.map(r => ({ repo: r.repo, hour: r.timestamp.getHours(), day: r.timestamp.getDay() })),
      ];

      for (const activity of allActivities) {
        // Repo activity
        const repoCount = stats.repoActivity.get(activity.repo) || 0;
        stats.repoActivity.set(activity.repo, repoCount + 1);

        // Hourly activity
        const hourCount = stats.hourlyActivity.get(activity.hour) || 0;
        stats.hourlyActivity.set(activity.hour, hourCount + 1);

        // Daily activity
        const dayCount = stats.dailyActivity.get(activity.day) || 0;
        stats.dailyActivity.set(activity.day, dayCount + 1);
      }

      return stats;
    } catch (error) {
      throw error;
    }
  }

  private async fetchRepoLanguages(repos: string[]): Promise<Map<string, number>> {
    const languages = new Map<string, number>();
    
    for (const repo of repos) {
      try {
        const response = await fetch(`${this.baseUrl}/repos/${repo}/languages`, {
          headers: this.getHeaders(),
        });

        if (response.ok) {
          const data = await response.json();
          for (const [lang, bytes] of Object.entries(data)) {
            const current = languages.get(lang) || 0;
            languages.set(lang, current + (bytes as number));
          }
        }
      } catch {
        // Skip on error
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return languages;
  }
}