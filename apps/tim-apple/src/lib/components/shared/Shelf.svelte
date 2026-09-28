<script lang="ts">
import type { Shelf } from "$lib/types";

export let shelf: Shelf;
export let horizontal: boolean = false;
</script>

<section class="shelf">
    {#if shelf.title}
        <div class="shelf-header">
            <h2>{shelf.title}</h2>
            {#if shelf.seeAllUrl}
                <a href={shelf.seeAllUrl} class="see-all">
                    See All
                    <span aria-hidden="true">›</span>
                </a>
            {/if}
        </div>
    {/if}

    <div class="shelf-content" class:horizontal>
        <slot />
    </div>
</section>

<style>
    .shelf {
        padding: 32px 0;
    }

    .shelf-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 0 var(--bodyGutter) 16px;
    }

    h2 {
        font: var(--title-2);
        color: var(--systemPrimary);
    }

    .see-all {
        color: var(--keyColor);
        font: var(--body-bold);
    }

    .shelf-content {
        display: grid;
        gap: 20px;
        padding: 0 var(--bodyGutter);
    }

    .shelf-content.horizontal {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
    }

    .shelf-content.horizontal::-webkit-scrollbar {
        display: none;
    }

    .shelf-content.horizontal > :global(*) {
        flex: 0 0 80%;
        scroll-snap-align: start;
    }

    @media (min-width: 768px) {
        .shelf-content.horizontal > :global(*) {
            flex: 0 0 calc(33.333% - 14px);
        }
    }
</style>
