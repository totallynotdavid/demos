<script lang="ts">
import Artwork from "$lib/components/shared/Artwork.svelte";
import type { BrickItem } from "$lib/types";

export let item: BrickItem;
</script>

<a href={item.url} class="brick">
    <Artwork artwork={item.media} alt="" />
    <div class="overlay"></div>
    <div class="text-container">
        {#if item.heading}
            <h4 class="heading">{item.heading}</h4>
        {/if}
        <h3 class="title">{item.title}</h3>
    </div>
</a>

<style>
    .brick {
        position: relative;
        aspect-ratio: 16 / 9;
        border-radius: var(--border-radius-large);
        overflow: hidden;
        display: block;
        box-shadow: var(--shadow-small);
        transition:
            transform 0.2s ease-out,
            box-shadow 0.2s ease-out;
    }

    .brick:hover {
        transform: scale(1.02);
        box-shadow: var(--shadow-medium);
    }

    .overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 60%;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
        border-radius: inherit;
    }

    .text-container {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 20px;
        color: white;
    }

    .heading {
        font: var(--callout-emphasized);
        opacity: 0.8;
        margin-bottom: 4px;
        text-transform: uppercase;
    }

    .title {
        font: var(--title-1-emphasized);
        text-wrap: pretty;
    }
</style>
