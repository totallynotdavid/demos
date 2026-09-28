<script lang="ts">
import SearchHighlight from "$lib/components/search/SearchHighlight.svelte";
import { searchState } from "$lib/state/search.svelte";

let { children } = $props();
</script>

<SearchHighlight query={searchState.query}>
  {@render children()}
</SearchHighlight>
