<script lang="ts">
import PostCard from "$lib/components/blog/PostCard.svelte";
import TypeWriter from "$lib/components/effects/TypeWriter.svelte";
import { searchState } from "$lib/state/search.svelte";
import type { SearchResult } from "$lib/types";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();

let displayedPosts = $derived(
  searchState.query.trim() ? searchState.results : data.posts,
);

$effect(() => {
  searchState.search(data.posts);
});
</script>

<svelte:head>
  <title>Home</title>
</svelte:head>

<h1>
  <TypeWriter text="Hello, I'm a curious mind exploring the digital realm" speed={15} />
</h1>

{#if displayedPosts.length === 0 && searchState.query}
  <p class="no-results">No posts found matching "{searchState.query}"</p>
{:else}
  <div class="posts">
    {#each displayedPosts as post (post.slug)}
      <div class="post-item">
        <PostCard
          title={post.title}
          excerpt={post.excerpt}
          date={post.date}
          slug={post.slug}
          tags={post.tags}
          matchCount={'matchCount' in post ? (post as SearchResult).matchCount : 0}
        />
      </div>
    {/each}
  </div>
{/if}

<style>
  h1 {
    margin-bottom: 3rem;
    font-size: 1.2em;
  }

  .posts {
    margin-top: 2rem;
  }

  .post-item {
    opacity: 0;
    animation: fadeIn 0.3s ease-out forwards;
  }

  @keyframes fadeIn {
    to { opacity: 1; }
  }

  .no-results {
    color: #888;
    text-align: center;
    margin: 3rem 0;
    opacity: 0;
    animation: fadeIn 0.4s ease-out forwards;
  }
</style>
