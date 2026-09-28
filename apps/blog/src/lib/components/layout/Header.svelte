<script lang="ts">
import { resolve } from "$app/paths";
import { page } from "$app/state";
import { searchState } from "$lib/state/search.svelte";
import SearchCount from "../search/SearchCount.svelte";

let searchInput: HTMLInputElement;

function activateSearch() {
  searchState.isActive = true;
  setTimeout(() => searchInput?.focus(), 0);
}

function deactivateSearch() {
  if (!searchState.query) {
    searchState.isActive = false;
  }
}
</script>

<nav>
  <a href="{resolve('/')}" class:active={page.url.pathname === resolve('/')}>Home</a>

  <div class="search">
    {#if searchState.isActive}
      <input
        type="text"
        bind:value={searchState.query}
        bind:this={searchInput}
        onblur={deactivateSearch}
        placeholder="Search"
        aria-label="Search posts"
      />
      {#if searchState.query}
        <div class="count-wrapper">
          <SearchCount count={searchState.totalMatches} label="matches" />
        </div>
      {/if}
    {:else}
      <button onclick={activateSearch} type="button">Search</button>
    {/if}
  </div>
</nav>

<style>
  nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 1rem;
    margin-bottom: 3rem;
    border-bottom: 1px solid #e0e0e0;
  }

  a {
    color: #888;
    text-decoration: none;
    transition: color 0.2s;
  }

  a:hover {
    color: #0000ff;
  }

  a.active {
    color: #000;
  }

  .search {
    display: flex;
    align-items: center;
    gap: 1rem;
    position: relative;
  }

  button {
    background: none;
    border: none;
    padding: 0;
    color: #888;
    cursor: pointer;
    font: inherit;
    transition: color 0.2s;
  }

  button:hover {
    color: #0000ff;
  }

  input {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: #000;
    outline: none;
    min-width: 120px;
    text-align: right;
  }

  input::placeholder {
    color: #888;
  }

  .count-wrapper {
    position: absolute;
    right: -6rem;
    white-space: nowrap;
  }
</style>
