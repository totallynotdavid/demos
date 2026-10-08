import { ApiError, type GitHubClient } from "./github";
import {
  LIST_ITEMS_QUERY,
  LISTS_QUERY,
  type ListItems,
  type ListItemsData,
  type ListsData,
  type RestStarred,
  repoFromGraphql,
  repoFromRest,
  STARRED_QUERY,
  type StarredData,
} from "./queries";
import type { Repo } from "./types";

export interface Page {
  /** Newest star first. */
  repos: Repo[];
  /** Opaque. Pass it back to continue, `null` when there is nothing more. */
  next: string | null;
}

export interface Probe {
  changed: boolean;
  etag: string | null;
  total: number;
}

export type ListMembership = Map<string, string[]>;

export interface StarredSource {
  /** `full` pages carry READMEs. The source can also read lists. */
  detail: "basic" | "full";
  /** Conditional request. A 304 costs no rate limit. */
  probe(etag: string | null, signal?: AbortSignal): Promise<Probe>;
  page(cursor: string | null, signal?: AbortSignal): Promise<Page>;
  lists(signal?: AbortSignal): Promise<ListMembership>;
}

const STAR_MEDIA_TYPE = "application/vnd.github.star+json";
const PAGE_SIZE = 100;
const MIN_PAGE_SIZE = 10;

export function sourceFor(client: GitHubClient, login: string): StarredSource {
  return client.hasToken
    ? new GraphqlSource(client, login)
    : new RestSource(client, login);
}

abstract class BaseSource {
  constructor(
    protected readonly client: GitHubClient,
    protected readonly login: string,
  ) {}

  /**
   * The newest single star. Its ETag changes when a star is added, and the
   * `rel="last"` page of a one-item listing is the total star count.
   */
  async probe(etag: string | null, signal?: AbortSignal): Promise<Probe> {
    const response = await this.client.rest(
      `/users/${encodeURIComponent(this.login)}/starred?per_page=1`,
      { etag, accept: STAR_MEDIA_TYPE, signal },
    );
    if (response.status === 304) {
      return { changed: false, etag, total: -1 };
    }
    const items = response.body as unknown[];
    return {
      changed: true,
      etag: response.etag,
      total: response.lastPage ?? items.length,
    };
  }
}

class RestSource extends BaseSource implements StarredSource {
  readonly detail = "basic";

  async page(cursor: string | null, signal?: AbortSignal): Promise<Page> {
    const number = cursor ? Number(cursor) : 1;
    const response = await this.client.rest(
      `/users/${encodeURIComponent(this.login)}/starred?per_page=${PAGE_SIZE}&page=${number}`,
      { accept: STAR_MEDIA_TYPE, signal },
    );
    return {
      repos: (response.body as RestStarred[]).map(repoFromRest),
      next: response.hasNext ? String(number + 1) : null,
    };
  }

  async lists(): Promise<ListMembership> {
    return new Map();
  }
}

class GraphqlSource extends BaseSource implements StarredSource {
  readonly detail = "full";
  private pageSize = PAGE_SIZE;

  /**
   * READMEs make 100-repo responses large. A server error halves the page size
   * for the rest of the run instead of failing the sync.
   */
  async page(cursor: string | null, signal?: AbortSignal): Promise<Page> {
    for (;;) {
      try {
        return await this.pageOnce(cursor, signal);
      } catch (error) {
        const retryable = error instanceof ApiError && error.status >= 500;
        if (!retryable || this.pageSize <= MIN_PAGE_SIZE) throw error;
        this.pageSize = Math.max(MIN_PAGE_SIZE, Math.floor(this.pageSize / 2));
      }
    }
  }

  private async pageOnce(
    cursor: string | null,
    signal?: AbortSignal,
  ): Promise<Page> {
    const data = await this.client.graphql<StarredData>(
      STARRED_QUERY,
      { login: this.login, first: this.pageSize, after: cursor },
      signal,
    );
    if (!data.user) throw new ApiError(404, "Not found");

    const { edges, pageInfo } = data.user.starredRepositories;
    return {
      repos: edges.map(repoFromGraphql),
      next: pageInfo.hasNextPage ? pageInfo.endCursor : null,
    };
  }

  async lists(signal?: AbortSignal): Promise<ListMembership> {
    const membership: ListMembership = new Map();
    let after: string | null = null;

    do {
      const data: ListsData = await this.client.graphql<ListsData>(
        LISTS_QUERY,
        { login: this.login, after },
        signal,
      );
      if (!data.user) break;

      for (const list of data.user.lists.nodes) {
        await this.addList(membership, list, signal);
      }
      const { pageInfo } = data.user.lists;
      after = pageInfo.hasNextPage ? pageInfo.endCursor : null;
    } while (after);

    return membership;
  }

  private async addList(
    membership: ListMembership,
    list: { id: string; name: string; items: ListItems },
    signal?: AbortSignal,
  ): Promise<void> {
    let items = list.items;
    for (;;) {
      for (const item of items.nodes) {
        if (!item?.id) continue;
        membership.set(item.id, [
          ...(membership.get(item.id) ?? []),
          list.name,
        ]);
      }
      if (!items.pageInfo.hasNextPage) return;

      const more = await this.client.graphql<ListItemsData>(
        LIST_ITEMS_QUERY,
        { id: list.id, after: items.pageInfo.endCursor },
        signal,
      );
      if (!more.node?.items) return;
      items = more.node.items;
    }
  }
}
