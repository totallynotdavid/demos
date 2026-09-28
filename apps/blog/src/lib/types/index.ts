export interface PostMetadata {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  tags: string[];
  published: boolean;
}

export interface Post extends PostMetadata {
  content?: string;
}

export interface SearchResult extends Post {
  matchCount: number;
}

export interface SearchState {
  query: string;
  isActive: boolean;
  results: SearchResult[];
  totalMatches: number;
  isSearching: boolean;
}
