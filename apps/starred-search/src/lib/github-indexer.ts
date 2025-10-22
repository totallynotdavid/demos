export interface GitHubRepo {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  updatedAt: string;
}

export interface IndexedRepo extends GitHubRepo {
  readmeContent: string;
}

export interface IndexingProgress {
  totalRepos: number;
  fetchedRepos: number;
  indexedReadmes: number;
  errors: number;
  errorMessages: string[];
  isComplete: boolean;
}

interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  owner: {
    login: string;
  };
}

export class GitHubIndexer {
  private baseUrl = 'https://api.github.com';
  private token?: string;
  private abortController?: AbortController;

  constructor(token?: string) {
    this.token = token;
  }

  abort() {
    this.abortController?.abort();
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = 3,
    backoffMs = 1000
  ): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        
        if (response.status === 403) {
          const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
          if (rateLimitRemaining === '0') {
            throw new Error('GitHub API rate limit exceeded. Please provide a Personal Access Token.');
          }
        }
        
        if (response.status === 404) {
          throw new Error('Resource not found');
        }
        
        if (!response.ok && i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, backoffMs * Math.pow(2, i)));
          continue;
        }
        
        return response;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, backoffMs * Math.pow(2, i)));
      }
    }
    throw new Error('Max retries reached');
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

  async fetchStarredRepos(
    username: string,
    onProgress?: (progress: IndexingProgress) => void
  ): Promise<IndexedRepo[]> {
    this.abortController = new AbortController();
    const repos: GitHubRepo[] = [];
    const indexed: IndexedRepo[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    const progress: IndexingProgress = {
      totalRepos: 0,
      fetchedRepos: 0,
      indexedReadmes: 0,
      errors: 0,
      errorMessages: [],
      isComplete: false,
    };

    try {
      // Fetch all starred repos with pagination
      while (hasMore) {
        const url = `${this.baseUrl}/users/${username}/starred?per_page=${perPage}&page=${page}`;
        const response = await this.fetchWithRetry(url, {
          headers: this.getHeaders(),
          signal: this.abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch starred repos: ${response.statusText}`);
        }

        const data: GitHubRepoResponse[] = await response.json();
        
        if (data.length === 0) {
          hasMore = false;
          break;
        }

        const mappedRepos = data.map(repo => ({
          id: repo.id,
          owner: repo.owner.login,
          name: repo.name,
          fullName: repo.full_name,
          url: repo.html_url,
          description: repo.description,
          language: repo.language,
          stars: repo.stargazers_count,
          updatedAt: repo.updated_at,
        }));

        repos.push(...mappedRepos);
        progress.fetchedRepos = repos.length;
        progress.totalRepos = repos.length;
        onProgress?.(progress);

        if (data.length < perPage) {
          hasMore = false;
        }
        page++;
      }

      // Download READMEs with concurrency control
      const concurrency = 5;
      for (let i = 0; i < repos.length; i += concurrency) {
        const batch = repos.slice(i, Math.min(i + concurrency, repos.length));
        const results = await Promise.allSettled(
          batch.map(repo => this.fetchReadme(repo))
        );

        results.forEach((result, idx) => {
          if (result.status === 'fulfilled' && result.value) {
            indexed.push(result.value);
            progress.indexedReadmes++;
          } else {
            progress.errors++;
            const repo = batch[idx];
            const errorMsg = `${repo.fullName}: ${
              result.status === 'rejected' ? result.reason?.message || 'Unknown error' : 'No README'
            }`;
            progress.errorMessages.push(errorMsg);
          }
        });

        onProgress?.(progress);
      }

      progress.isComplete = true;
      onProgress?.(progress);

      return indexed;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Indexing aborted by user');
      }
      throw error;
    }
  }

  private async fetchReadme(repo: GitHubRepo): Promise<IndexedRepo | null> {
    const url = `${this.baseUrl}/repos/${repo.fullName}/readme`;
    
    try {
      const response = await this.fetchWithRetry(
        url,
        {
          headers: this.getHeaders(),
          signal: this.abortController?.signal,
        },
        2,
        500
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      // Decode base64 content
      let content = '';
      if (data.content) {
        try {
          content = atob(data.content.replace(/\n/g, ''));
        } catch {
          // If base64 decode fails, try raw content
          const rawUrl = data.download_url;
          if (rawUrl) {
            const rawResponse = await fetch(rawUrl, {
              signal: this.abortController?.signal,
            });
            if (rawResponse.ok) {
              content = await rawResponse.text();
            }
          }
        }
      }

      if (!content) {
        return null;
      }

      return {
        ...repo,
        readmeContent: content,
      };
    } catch {
      return null;
    }
  }
}
