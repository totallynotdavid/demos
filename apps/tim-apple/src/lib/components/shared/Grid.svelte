<script lang="ts">
import type { GridItem } from "$lib/types";

export let items: GridItem[];
export const columns = 3;
</script>

<ul class="grid" style:--columns={columns}>
    {#each items as item}
        <li>
            <slot {item} />
        </li>
    {/each}
</ul>

<style>
    .grid {
        display: grid;
        grid-template-columns: repeat(var(--columns), 1fr);
        gap: 20px;
        padding: 0 var(--bodyGutter);
    }

    @media (max-width: 768px) {
        .grid {
            grid-template-columns: 1fr;
        }
    }
</style>
