<script lang="ts">
import type { Snippet } from "svelte";
import { highlightText } from "$lib/utils/search";

let { query, children }: { query: string; children?: Snippet } = $props();

let container: HTMLElement;

$effect(() => {
  if (container) {
    highlightText(container, query);
  }
});
</script>

<div bind:this={container}>
  {@render children?.()}
</div>

<style>
  :global(.highlight) {
    background-color: #ffeb3b;
    color: #000;
    padding: 0 2px;
    border-radius: 2px;
  }
</style>
