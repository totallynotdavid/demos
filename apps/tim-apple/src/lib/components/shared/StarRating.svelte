<script lang="ts">
export let rating: number;

const stars = [1, 2, 3, 4, 5].map((position) => {
	if (position <= Math.floor(rating)) return 100;
	if (position > Math.ceil(rating)) return 0;
	return Math.round((rating % 1) * 100);
});
</script>

<div class="stars" aria-label="{rating} out of 5 stars">
    {#each stars as fill}
        <span class="star" style:--fill="{fill}%">★</span>
    {/each}
</div>

<style>
    .stars {
        display: flex;
        gap: 2px;
        color: var(--systemSecondary);
    }
    .star {
        position: relative;
        font-size: 12px;
    }
    .star::before {
        content: "★";
        position: absolute;
        color: var(--keyColor);
        width: var(--fill);
        overflow: hidden;
    }
</style>
