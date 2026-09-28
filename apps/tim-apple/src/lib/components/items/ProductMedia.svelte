<script lang="ts">
import Artwork from "$lib/components/shared/Artwork.svelte";
import type { ProductMediaItem } from "$lib/types";

export let item: ProductMediaItem;
</script>

<div class="media">
    <Artwork artwork={item.screenshot} alt="Screenshot" />
</div>

<style>
    .media {
        border-radius: 12px;
        overflow: hidden;
        background: var(--systemQuaternary);
    }
</style>
