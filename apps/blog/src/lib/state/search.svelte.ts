import type { Post, SearchResult, SearchState } from "../types";
import { searchPosts } from "../utils/search";

function createSearchState() {
  let state = $state<SearchState>({
    query: "",
    isActive: false,
    results: [],
    totalMatches: 0,
    isSearching: false,
  });

  let abortController: AbortController | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    get query() {
      return state.query;
    },
    set query(value: string) {
      state.query = value;
    },
    get isActive() {
      return state.isActive;
    },
    set isActive(value: boolean) {
      state.isActive = value;
    },
    get results() {
      return state.results;
    },
    get totalMatches() {
      return state.totalMatches;
    },
    get isSearching() {
      return state.isSearching;
    },

    search(posts: Post[], debounce = 300) {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (abortController) abortController.abort();

      if (!state.query.trim()) {
        state.results = [];
        state.totalMatches = 0;
        state.isSearching = false;
        return;
      }

      state.isSearching = true;
      abortController = new AbortController();
      const signal = abortController.signal;

      debounceTimer = setTimeout(() => {
        if (signal.aborted) return;

        const results = searchPosts(posts, state.query);
        const totalMatches = results.reduce((sum, r) => sum + r.matchCount, 0);

        if (!signal.aborted) {
          state.results = results;
          state.totalMatches = totalMatches;
          state.isSearching = false;
        }
      }, debounce);
    },

    clear() {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (abortController) abortController.abort();

      state.query = "";
      state.isActive = false;
      state.results = [];
      state.totalMatches = 0;
      state.isSearching = false;
    },
  };
}

export const searchState = createSearchState();
