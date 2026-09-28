<script lang="ts">
import { base } from "$app/paths";

let {
  title,
  excerpt,
  date,
  slug,
  tags,
  matchCount = 0,
}: {
  title: string;
  excerpt: string;
  date: string;
  slug: string;
  tags: string[];
  matchCount?: number;
} = $props();

let formattedDate = $derived(
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
);
</script>

<article class="card">
  <h2><a href="{base}/blog/{slug}">{title}</a></h2>
  <time datetime={date}>{formattedDate}</time>
  <p class="excerpt">{excerpt}</p>
  
  {#if tags.length > 0}
    <div class="tags">
      {#each tags as tag}
        <span class="tag">{tag}</span>
      {/each}
    </div>
  {/if}

  {#if matchCount > 0}
    <div class="match-badge">
      {matchCount} {matchCount === 1 ? 'match' : 'matches'}
    </div>
  {/if}
</article>

<style>
  .card {
    position: relative;
    padding-bottom: 2rem;
    margin-bottom: 2rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .card:last-child {
    border-bottom: none;
  }

  h2 {
    margin-bottom: 0.5rem;
  }

  h2 a {
    color: inherit;
    text-decoration: none;
    transition: color 0.2s;
  }

  h2 a:hover {
    color: #0000ff;
    text-decoration: underline;
  }

  time {
    display: block;
    font-size: 0.9em;
    color: #888;
    margin-bottom: 1rem;
  }

  .excerpt {
    margin-bottom: 1rem;
    color: #333;
  }

  .tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .tag {
    font-size: 0.85em;
    color: #666;
    background-color: #f5f5f5;
    padding: 0.25rem 0.75rem;
    border-radius: 3px;
  }

  .match-badge {
    position: absolute;
    right: 0;
    top: 0;
    font-size: 0.75rem;
    font-family: monospace;
    color: #2563eb;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    background: #eff6ff;
    border-radius: 4px;
  }
</style>
