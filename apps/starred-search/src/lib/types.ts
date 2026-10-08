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
