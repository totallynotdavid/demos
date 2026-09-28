<script lang="ts">
import LockupItem from "$lib/components/items/LockupItem.svelte";
import TodayCard from "$lib/components/items/TodayCard.svelte";
import Artwork from "$lib/components/shared/Artwork.svelte";
import { mockData } from "$lib/data/mock-data";
import type { ArticleImageItem, ArticleTextItem } from "$lib/types";

const page = mockData.articlePage;
</script>

<svelte:head>
    <title>{page.card.title} - App Store</title>
</svelte:head>

<div class="article-page">
    <div class="article-layout">
        <div class="hero-card">
            <TodayCard card={page.card} />
        </div>

        <article class="article-content">
            {#each page.shelves as shelf}
                {#if shelf.contentType === 'text'}
                    <section class="text-section">
                        {#each shelf.items as item}
                            <p>{(item as ArticleTextItem).text}</p>
                        {/each}
                    </section>
                {:else if shelf.contentType === 'image'}
                    <section class="image-section">
                        {#each shelf.items as item}
                            <div class="featured-image">
                                <Artwork artwork={(item as ArticleImageItem).artwork} alt="" />
                            </div>
                        {/each}
                    </section>
                {/if}
            {/each}

            {#if page.footerApp}
                <div class="footer-app">
                    <LockupItem item={page.footerApp} buttonVariant="blue" size="medium" />
                </div>
            {/if}
        </article>
    </div>
</div>

<style>
    .article-page {
        flex-grow: 1;
        width: 100%;
        margin: 0 auto;
    }

    .article-layout {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        max-width: 1600px;
        margin: 0 auto;
    }

    @media (min-width: 768px) {
        .article-layout {
            padding: 2em var(--bodyGutter);
        }
    }

    @media (min-width: 1024px) {
        .article-layout {
            flex-direction: row;
            align-items: flex-start;
        }
    }

    .hero-card {
        flex-shrink: 0;
        aspect-ratio: 3 / 4;
        width: 100%;
    }

    @media (max-width: 767px) {
        .hero-card :global(.today-card) {
            --border-radius: 0;
        }
    }
    @media (min-width: 768px) {
        .hero-card {
            width: 100%;
            aspect-ratio: 16 / 9;
        }
    }
    @media (min-width: 1024px) {
        .hero-card {
            position: sticky;
            top: 2em;
            aspect-ratio: 3 / 4;
            height: min(calc(100vh - 4em), calc(33vw * 4 / 3));
            min-height: 420px;
            max-height: 700px;
            width: auto;
        }
    }

    .article-content {
        width: 100%;
        margin-top: 20px;
        padding-bottom: var(--bodyGutter);
        display: flex;
        flex-direction: column;
        gap: 32px;
    }

    @media (min-width: 768px) {
        .article-content {
            width: 100%;
            margin-top: 0;
        }
    }
    @media (min-width: 1024px) {
        .article-content {
            min-width: calc(50% - 20px);
        }
    }

    .text-section p {
        font: var(--body);
        line-height: 1.6;
        color: var(--systemPrimary);
        padding: 0 var(--bodyGutter);
    }

    .featured-image {
        border-radius: var(--border-radius-large);
        overflow: hidden;
        margin: 0 var(--bodyGutter);
    }

    .footer-app {
        padding: 24px;
        background: var(--systemQuinary);
        border-radius: var(--border-radius-medium);
        margin: 0 var(--bodyGutter);
    }

    .footer-app :global(h3) {
        font: var(--title-2);
        color: var(--systemPrimary);
    }

    .footer-app :global(p) {
        font: var(--callout);
        color: var(--systemSecondary);
    }
</style>
