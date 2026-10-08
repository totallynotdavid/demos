import { type Filters, NO_FILTERS, type Sort } from "./search";

/** What the user chose on the stars page. It lives in the address bar. */
export interface View {
  query: string;
  filters: Filters;
  sort: Sort;
}

export const DEFAULT_VIEW: View = {
  query: "",
  filters: NO_FILTERS,
  sort: "relevance",
};

const SORTS: Sort[] = ["relevance", "starred", "stars", "updated"];

export function parseView(search: string): View {
  const params = new URLSearchParams(search);
  const sort = params.get("sort");
  return {
    query: params.get("q") ?? "",
    filters: {
      language: params.get("lang"),
      topics: params.getAll("topic"),
      list: params.get("list"),
    },
    sort: SORTS.includes(sort as Sort) ? (sort as Sort) : DEFAULT_VIEW.sort,
  };
}

export function viewToSearch(view: View): string {
  const params = new URLSearchParams();
  if (view.query) params.set("q", view.query);
  if (view.filters.language) params.set("lang", view.filters.language);
  for (const topic of view.filters.topics) params.append("topic", topic);
  if (view.filters.list) params.set("list", view.filters.list);
  if (view.sort !== DEFAULT_VIEW.sort) params.set("sort", view.sort);
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function hasFilters(filters: Filters): boolean {
  return (
    filters.language !== null ||
    filters.topics.length > 0 ||
    filters.list !== null
  );
}
