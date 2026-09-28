<script lang="ts">
export let url: string;
export let withLabel: boolean = false;

let isShareSheetOpen = false;

async function handleShareClick() {
	isShareSheetOpen = !isShareSheetOpen;

	if (
		typeof navigator !== "undefined" &&
		typeof navigator.share === "function"
	) {
		try {
			await navigator.share({ url });
			isShareSheetOpen = false;
		} catch {
			isShareSheetOpen = false;
		}
	} else {
		isShareSheetOpen = false;
	}
}
</script>

<button
	on:click={handleShareClick}
	aria-label="Share"
	class:active={isShareSheetOpen}
	class:with-label={withLabel}
>
	<svg
		viewBox="0 0 24 24"
		fill="currentColor"
		aria-hidden="true"
	>
		<path
			d="M16.5 5.5v-2h-9v2h-2v-3c0-.55.45-1 1-1h11c.55 0 1 .45 1 1v3h-2zm-4.5 10.79l-3.15-3.15-1.41 1.41 4.56 4.56 4.56-4.56-1.41-1.41-3.15 3.15V8.5h-2v7.79z"
		/>
	</svg>

	{#if withLabel}
		Share
	{/if}
</button>

<style>
	button {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: var(--share-arrow-size, 32px);
		height: var(--share-arrow-size, 32px);
		border-radius: var(--share-arrow-size, 32px);
		background: var(--systemQuaternary-onDark);
		transition: background-color 210ms ease-out;
		mix-blend-mode: plus-lighter;
		border: none;
		cursor: pointer;
	}

	button.with-label {
		width: auto;
		padding: 0 16px;
		gap: 8px;
		font: var(--body-emphasized);
	}

	button.with-label svg {
		height: 16px;
		width: auto;
		position: relative;
		top: -2px;
	}

	button.active,
	button:hover {
		background-color: rgba(var(--systemTertiary-onDark-rgb, 120, 120, 128), 0.13);
	}

	button svg {
		width: 37%;
		fill: var(--systemPrimary-onDark);
		overflow: visible;
	}
</style>
