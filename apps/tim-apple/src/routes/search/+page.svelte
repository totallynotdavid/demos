<script lang="ts">
import Shelf from "$lib/components/shared/Shelf.svelte";
import { mockData } from "$lib/data/mock-data";

let page = mockData.searchPage;
let searchQuery = "";
</script>

<svelte:head>
    <title>Search - App Store</title>
</svelte:head>

<div class="search-page">
    <div class="search-header">
        <h1>{page.title}</h1>

        <form class="search-form" on:submit|preventDefault>
            <div class="search-input-wrapper">
                <svg
                    class="search-svg"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <path
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    />
                </svg>
                <input
                    class="search-input"
                    type="search"
                    placeholder="Games, Apps, Stories, and More"
                    bind:value={searchQuery}
                />
            </div>
        </form>
    </div>

    {#if !searchQuery}
        {#each page.shelves as shelf}
            <Shelf {shelf}>
                <ul class="search-links">
                    {#each shelf.items as item}
                        <li>
                            <a href={item.url} class="search-link">
                                <span class="search-icon" aria-hidden="true">
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                        />
                                    </svg>
                                </span>
                                {item.title}
                            </a>
                        </li>
                    {/each}
                </ul>
            </Shelf>
        {/each}
    {:else}
        <div class="no-results">
            <p>Search results for "{searchQuery}"</p>
        </div>
    {/if}
</div>

<style>
    .search-page {
        padding: 20px 0;
    }

    .search-header {
        padding: 0 var(--bodyGutter);
        margin-bottom: 32px;
    }

    h1 {
        font: var(--large-title-emphasized);
        margin-bottom: 20px;
    }

    .search-form {
        max-width: 600px;
    }

    .search-input-wrapper {
        position: relative;
    }

    .search-svg {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        fill: var(--systemSecondary);
        pointer-events: none;
    }

    .search-input {
        width: 100%;
        height: 48px;
        padding: 12px 12px 12px 40px;
        font: var(--title-2);
        border: 1px solid var(--systemQuaternary);
        border-radius: var(--border-radius-medium);
        background: var(--systemQuinary);
        color: var(--systemPrimary);
    }

    .search-input:focus {
        outline: 2px solid var(--keyColor);
        outline-offset: 2px;
        border-color: var(--keyColor);
    }

    .search-links {
        display: grid;
        gap: 10px;
        grid-template-columns: 1fr;
        padding: 0 var(--bodyGutter);
    }

    @media (min-width: 768px) {
        .search-links {
            grid-template-columns: 1fr 1fr;
        }
    }

    .search-link {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 12px;
        font: var(--title-2);
        border-radius: var(--border-radius-large);
        background: var(--systemQuinary);
        color: var(--systemPrimary);
        text-decoration: none;
        transition: background-color 0.2s ease;
    }

    .search-link:hover {
        background: var(--systemQuaternary);
        text-decoration: none;
    }

    .search-icon {
        display: flex;
    }

    .search-icon svg {
        width: 20px;
        height: 20px;
        fill: var(--systemSecondary);
    }

    .no-results {
        padding: 40px var(--bodyGutter);
        text-align: center;
        color: var(--systemSecondary);
    }
</style>
