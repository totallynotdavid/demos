<script lang="ts">
import type { Artwork } from "$lib/types";

export let icon: Artwork;
export let size: "small" | "medium" | "large" = "medium";
export let withBorder: boolean = false;

const sizes = {
	small: "64px",
	medium: "100px",
	large: "128px",
};

$: needsBorder =
	withBorder || (icon.bgColor && icon.bgColor.toLowerCase() === "#ffffff");
</script>

<div class="app-icon" class:with-border={needsBorder} style:--size={sizes[size]}>
    <img src={icon.url} alt="" />
</div>

<style>
    .app-icon {
        width: var(--size);
        height: var(--size);
        border-radius: 23%;
        overflow: hidden;
    }

    .with-border {
        box-shadow: 0 0 0 1px var(--systemQuaternary);
    }

    img {
        width: 100%;
        height: 100%;
        display: block;
    }
</style>
