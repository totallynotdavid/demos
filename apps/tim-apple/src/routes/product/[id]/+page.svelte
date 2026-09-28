<script lang="ts">
import AppIcon from "$lib/components/items/AppIcon.svelte";
import ProductBadge from "$lib/components/items/ProductBadge.svelte";
import ProductMedia from "$lib/components/items/ProductMedia.svelte";
import ShareArrowButton from "$lib/components/shared/ShareArrowButton.svelte";
import Shelf from "$lib/components/shared/Shelf.svelte";
import StarRating from "$lib/components/shared/StarRating.svelte";
import { mockData } from "$lib/data/mock-data";
import type {
	ProductBadgeItem,
	ProductDescriptionItem,
	ProductMediaItem,
	ProductRatingItem,
} from "$lib/types";

const page = mockData.productPage;

const backgroundImage = `https://placehold.co/1200x400/EEE/31343C?text=`;
</script>

<svelte:head>
    <title>{page.title} - App Store</title>
</svelte:head>

<div class="product-page">
    <header
        class="product-header"
        style:--background-image="url({backgroundImage})"
    >
        <div class="blur-layer"></div>
        <div class="header-content">
            <AppIcon icon={page.icon} size="large" withBorder />

            <div class="header-info">
                <h1>{page.title}</h1>
                <p class="subtitle">{page.subtitle}</p>

                <div class="header-actions">
                    <span class="get-button blue">{page.price}</span>
                    <ShareArrowButton url={page.icon.url} />
                </div>
            </div>
        </div>
    </header>

    {#each page.shelves as shelf}
        {#if shelf.contentType === 'badge'}
            <section class="badges">
                {#each shelf.items as item}
                    <ProductBadge item={item as ProductBadgeItem} />
                {/each}
            </section>
        {:else if shelf.contentType === 'media'}
            <Shelf {shelf} horizontal>
                {#each shelf.items as item}
                    <ProductMedia item={item as ProductMediaItem} />
                {/each}
            </Shelf>
        {:else if shelf.contentType === 'description'}
            <section class="description">
                {#each shelf.items as item}
                    <p>{(item as ProductDescriptionItem).text}</p>
                {/each}
            </section>
        {:else if shelf.contentType === 'rating'}
            <Shelf {shelf}>
                {#each shelf.items as item}
                    {@const ratingItem = item as ProductRatingItem}
                    <div class="rating-summary">
                        <div class="rating-score">
                            <div class="rating-number">{ratingItem.average}</div>
                            <p>out of 5</p>
                        </div>

                        <div class="rating-details">
                            <div class="rating-bars">
                                {#each ratingItem.distribution as count, i}
                                    <div class="rating-bar">
                                        <StarRating rating={5 - i} />
                                        <div class="bar">
                                            <div
                                                class="bar-fill"
                                                style:width="{(count /
                                                    ratingItem.count) *
                                                    100}%"
                                            ></div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                            <p class="rating-count">
                                {ratingItem.count.toLocaleString()} Ratings
                            </p>
                        </div>
                    </div>
                {/each}
            </Shelf>
        {/if}
    {/each}
</div>

<style>
    .product-page {
        padding: 20px 0;
    }

    .product-header {
        position: relative;
        display: flex;
        align-items: center;
        height: 286px;
        color: var(--systemPrimary-onDark);
        background:
            linear-gradient(to bottom, transparent 20%, rgba(0, 0, 0, 0.8) 100%),
            var(--background-image),
            var(--pageBg);
        background-size: cover;
        background-position: center;
        border-bottom: 1px solid var(--systemQuaternary);
    }

    .blur-layer {
        position: absolute;
        z-index: 1;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        backdrop-filter: blur(100px) saturate(1.5);
    }

    .header-content {
        position: relative;
        z-index: 2;
        display: flex;
        gap: 1.5em;
        align-items: center;
        margin: 0 var(--bodyGutter);
        max-width: 840px;
    }

    @media (min-width: 1068px) {
        .header-content {
            margin: 0 auto;
        }
    }

    .header-info {
        flex: 1;
        min-width: 0;
    }

    h1 {
        font: var(--header-emphasized);
        color: var(--systemPrimary-onDark);
        text-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
    }

    .subtitle {
        font: var(--title-2);
        color: var(--systemPrimary-onDark);
        mix-blend-mode: plus-lighter;
    }

    .header-actions {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-top: 10px;
    }

    .badges {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: 16px;
        padding: 0 var(--bodyGutter);
        margin: 32px auto;
        width: 100%;
        max-width: 840px;
    }

    .description {
        padding: 0 var(--bodyGutter);
        margin-bottom: 32px;
    }

    .description p {
        font: var(--body);
        line-height: 1.6;
        color: var(--systemPrimary);
    }

    .rating-summary {
        display: flex;
        gap: 32px;
        padding: 0 var(--bodyGutter);
    }

    .rating-score {
        text-align: center;
        min-width: 100px;
    }

    .rating-number {
        font-size: 56px;
        font-weight: 700;
        color: var(--systemPrimary);
    }

    .rating-score p {
        font: var(--callout);
        color: var(--systemSecondary);
    }

    .rating-details {
        flex: 1;
    }

    .rating-bars {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;
    }

    .rating-bar {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .bar {
        flex: 1;
        height: 4px;
        background: var(--systemQuaternary);
        border-radius: 2px;
        overflow: hidden;
    }

    .bar-fill {
        height: 100%;
        background: var(--systemSecondary);
    }

    .rating-count {
        font: var(--callout);
        color: var(--systemSecondary);
        text-align: right;
    }

    @media (max-width: 767px) {
        .product-header {
            height: 200px;
        }
        .rating-summary {
            flex-direction: column;
            align-items: center;
        }

        .header-content {
            flex-direction: column;
            align-items: flex-start;
            text-align: center;
        }

        .header-info {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
        }
    }
</style>
