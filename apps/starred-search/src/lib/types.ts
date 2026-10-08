export interface Repo {
  /** GitHub node ID. REST (`node_id`) and GraphQL (`id`) agree on it. */
  id: string;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  updatedAt: string;
  starredAt: string;
  lists: string[];
  readme: string | null;
}

/** READMEs and lists come only from a token. Without one, they must not show. */
export function withoutTokenData(repo: Repo): Repo {
  if (repo.readme === null && repo.lists.length === 0) return repo;
  return { ...repo, readme: null, lists: [] };
}
