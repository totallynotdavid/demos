import type { IndexedRepo } from "./github-indexer";

export interface SearchResult extends IndexedRepo {
  score: number;
  matchedLines: string[];
}

export type SortOption = "relevance" | "stars" | "updated";

export class SearchIndex {
  private repos: IndexedRepo[] = [];

  setRepos(repos: IndexedRepo[]) {
    this.repos = repos;
  }

  getRepos(): IndexedRepo[] {
    return this.repos;
  }

  search(query: string, sortBy: SortOption = "relevance"): SearchResult[] {
    if (!query.trim()) {
      return this.repos.map((repo) => ({
        ...repo,
        score: 0,
        matchedLines: [],
      }));
    }

    const queryLower = query.toLowerCase();
    const queryTerms = queryLower
      .split(/\s+/)
      .filter((term) => term.length > 0);

    const results: SearchResult[] = [];

    for (const repo of this.repos) {
      const searchableText = [
        repo.name,
        repo.owner,
        repo.fullName,
        repo.description || "",
        repo.language || "",
        repo.readmeContent,
      ]
        .join(" ")
        .toLowerCase();

      let score = 0;
      const matchedLines: string[] = [];

      // Check for exact phrase match
      if (searchableText.includes(queryLower)) {
        score += 100;
      }

      // Check for all terms present
      const allTermsMatch = queryTerms.every((term) =>
        searchableText.includes(term),
      );
      if (allTermsMatch) {
        score += 50;
      }

      // Score based on term frequency
      for (const term of queryTerms) {
        const matches = (searchableText.match(new RegExp(term, "g")) || [])
          .length;
        score += matches * 10;

        // Boost if term matches in important fields
        if (repo.name.toLowerCase().includes(term)) {
          score += 30;
        }
        if (repo.description?.toLowerCase().includes(term)) {
          score += 20;
        }
        if (repo.language?.toLowerCase().includes(term)) {
          score += 15;
        }
      }

      // Find matching lines in README
      if (repo.readmeContent) {
        const lines = repo.readmeContent.split("\n");
        for (const line of lines) {
          const lineLower = line.toLowerCase();
          if (queryTerms.some((term) => lineLower.includes(term))) {
            matchedLines.push(line.trim());
            if (matchedLines.length >= 3) break;
          }
        }
      }

      if (score > 0) {
        results.push({
          ...repo,
          score,
          matchedLines,
        });
      }
    }

    // Sort results
    results.sort((a, b) => {
      if (sortBy === "relevance") {
        return b.score - a.score;
      } else if (sortBy === "stars") {
        return b.stars - a.stars;
      } else if (sortBy === "updated") {
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }
      return 0;
    });

    return results;
  }

  clear() {
    this.repos = [];
  }
}
