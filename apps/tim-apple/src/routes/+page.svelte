<script lang="ts">
import LockupItem from "$lib/components/items/LockupItem.svelte";
import TodayCard from "$lib/components/items/TodayCard.svelte";
import Shelf from "$lib/components/shared/Shelf.svelte";
import { mockData } from "$lib/data/mock-data";
import type {
	LockupItem as LockupItemType,
	TodayCard as TodayCardType,
} from "$lib/types";

const page = mockData.todayPage;
</script>

<svelte:head>
    <title>Today - App Store</title>
</svelte:head>

<div class="today-page">
    <h1>{page.title}</h1>

    {#each page.shelves as shelf, i}
        {#if shelf.contentType === 'todayCard'}
            {@const stretchFirst = i % 2 === 0}
            <Shelf {shelf}>
                <div
                    class="today-cards"
                    class:single-card={shelf.items.length === 1}
                    class:two-cards={shelf.items.length === 2}
                    class:stretch-first={stretchFirst}
                >
                    {#each shelf.items as card}
                        <div class="card-wrapper">
                            <TodayCard card={card as TodayCardType} />
                        </div>
                    {/each}
                </div>
            </Shelf>
        {:else if shelf.contentType === 'lockup'}
            <Shelf {shelf}>
                <div class="lockup-list">
                    <div class="lockup-header">
                        {#if shelf.heading}
                            <p class="lockup-heading-label">{shelf.heading}</p>
                        {/if}
                    </div>
                    <ul class="lockup-items">
                        {#each shelf.items as item}
                            <li>
                                <LockupItem item={item as LockupItemType} size="small" buttonVariant="gray" />
                            </li>
                        {/each}
                    </ul>
                </div>
            </Shelf>
        {/if}
    {/each}
</div>

<style>
    .today-page {
        padding: 20px 0;
        max-width: 1440px;
        margin: 0 auto;
    }

    h1 {
        font: var(--large-title-emphasized);
        padding: 0 var(--bodyGutter);
        margin-bottom: 20px;
    }

    .today-cards {
        display: grid;
        gap: 16px;
        padding: 0 var(--bodyGutter);
    }

    .card-wrapper {
        max-height: 600px;
        min-height: 200px;
    }

    .today-cards.single-card .card-wrapper {
        aspect-ratio: 16/9;
        max-height: none;
    }

    @media (min-width: 768px) {
        .today-cards {
            grid-template-columns: repeat(2, 1fr);
        }

        .today-cards.single-card {
            grid-template-columns: 1fr;
        }

        .today-cards.single-card .card-wrapper {
            grid-column: 1 / -1;
        }

        .today-cards.two-cards.stretch-first {
            grid-template-columns: 2fr 1fr;
        }

        .today-cards.two-cards:not(.stretch-first) {
            grid-template-columns: 1fr 2fr;
        }
    }

    @media (min-width: 1024px) {
        .today-cards {
            grid-template-columns: repeat(3, 1fr);
        }

        .today-cards.two-cards.stretch-first {
            grid-template-columns: 2fr 1fr;
        }

        .today-cards.two-cards:not(.stretch-first) {
            grid-template-columns: 1fr 2fr;
        }
    }

    .lockup-list {
        padding: 0 var(--bodyGutter);
    }

    .lockup-header {
        margin-bottom: 12px;
    }

    .lockup-heading-label {
        font: var(--callout-emphasized);
        color: var(--systemSecondary);
        text-transform: uppercase;
    }

    .lockup-items {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    @media (min-width: 768px) {
        .lockup-items {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
        }
    }
</style>
