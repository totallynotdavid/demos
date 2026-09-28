<script lang="ts">
import StarRating from "$lib/components/shared/StarRating.svelte";
import type { ProductBadgeItem } from "$lib/types";

export let item: ProductBadgeItem;
</script>

<div class="badge">
    <div class="heading">{item.heading}</div>
    <div class="value">
        {#if item.type === 'rating'}
            <span class="large">{item.text}</span>
            {#if item.rating !== undefined}
                <StarRating rating={item.rating} />
            {/if}
        {:else if item.type === 'award'}
            <span class="icon">
                <svg
                    viewBox="0 0 24 42"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        d="M19.1411 41.594C18.9189 41.157 18.4913 40.5841 17.8582 39.8752C16.1362 37.962 14.1209 35.8266 12.0001 33.6001C9.87926 35.8266 7.86398 37.962 6.14195 39.8752C5.50889 40.5841 5.08126 41.157 4.8591 41.594C3.88248 41.685 2.92404 41.194 2.4578 40.3399C1.19637 38.0436 -0.166667 33.626 -0.166667 29.0969C-0.166667 21.0583 5.37019 14.5834 12.0001 14.5834C18.63 14.5834 24.1668 21.0583 24.1668 29.0969C24.1668 33.626 22.8038 38.0436 21.5423 40.3399C21.0761 41.194 20.1176 41.685 19.1411 41.594ZM12.0001 0.416748L15.3376 9.38925L25.1668 9.96225L17.5209 16.483L19.9834 26.0707L12.0001 20.9122L4.01679 26.0707L6.47929 16.483L-1.16667 9.96225L8.66262 9.38925L12.0001 0.416748Z"
                        fill="currentColor"></path>
                </svg>
            </span>
            <span class="caption">Editor's Choice</span>
        {:else}
            <span class="large">{item.text}</span>
        {/if}
    </div>
</div>

<style>
    .badge {
        text-align: center;
        padding: 16px 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        height: 100%;
    }

    .heading {
        font: var(--subhead-emphasized);
        color: var(--systemSecondary);
        text-transform: uppercase;
    }

    .value {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        color: var(--systemSecondary);
    }

    .large {
        font: var(--title-1-emphasized);
        color: var(--systemSecondary);
    }

    .icon {
        height: 42px;
        margin-bottom: -4px;
    }

    .icon svg {
        height: 100%;
        color: var(--systemSecondary);
    }

    .caption {
        font: var(--subhead-medium);
        color: var(--systemSecondary);
    }
</style>
