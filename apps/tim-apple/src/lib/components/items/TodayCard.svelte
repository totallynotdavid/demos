<script lang="ts">
import { goto } from "$app/navigation";
import AppIcon from "$lib/components/items/AppIcon.svelte";
import Artwork from "$lib/components/shared/Artwork.svelte";
import type { TodayCard } from "$lib/types";

export let card: TodayCard;

const isLight = card.style === "light";

function handleLockupClick(event: MouseEvent | KeyboardEvent) {
	event.stopPropagation();
	if (card.lockup?.url) {
		goto(card.lockup.url);
	}
}

function handleLockupKeydown(event: KeyboardEvent) {
	if (event.key === "Enter" || event.key === " ") {
		event.preventDefault();
		handleLockupClick(event);
	}
}
</script>

<a
    href={card.url}
    class="today-card"
    class:light={isLight}
    class:dark={!isLight}
>
    <div class="media-container">
        {#if card.isAppIcon}
            <AppIcon icon={card.media} size="large" />
        {:else}
            <Artwork artwork={card.media} alt="" />
        {/if}
    </div>

    <div class="wrapper">
        <div class="information-layer">
            <div class="content-container">
                <div class="protection-layer"></div>
                <div class="title-container">
                    {#if card.heading}
                        <p class="heading">{card.heading}</p>
                    {/if}
                    <h3>{card.title}</h3>
                </div>
            </div>
            
            {#if card.lockup}
                <div 
                    class="lockup-footer" 
                    role="link" 
                    tabindex="0"
                    on:click={handleLockupClick}
                    on:keydown={handleLockupKeydown}
                >
                    <div class="lockup-content">
                        <AppIcon icon={card.lockup.icon} size="small" />
                        <div class="lockup-info">
                            <p class="lockup-heading">{card.heading}</p>
                            <h4 class="lockup-title">{card.lockup.title}</h4>
                            <p class="lockup-subtitle">{card.lockup.subtitle}</p>
                        </div>
                    </div>
                    <span class="view-button">View</span>
                </div>
            {/if}
        </div>
    </div>
</a>

<style lang="scss">
    .today-card {
        --today-card-border-radius: var(--border-radius-large);
        --protection-layer-bottom-offset: 0px;
        background-color: var(--systemPrimary-onDark);

        position: relative;
        display: flex;
        align-items: end;
        height: 100%;
        overflow: hidden;
        border-radius: var(--today-card-border-radius);
        box-shadow: var(--shadow-small);
        text-decoration: none;
        transition:
            transform 0.2s ease-out,
            box-shadow 0.2s ease-out;
    }

    .today-card:hover {
        transform: scale(1.02);
        box-shadow: var(--shadow-medium);
    }

    .dark {
        --today-card-text-color: var(--systemPrimary-onDark);
        --today-card-text-accent-color: var(--systemSecondary-onDark);
        --today-card-background-tint-color: rgba(0, 0, 0, 0.18);
        --today-card-text-accent-blend-mode: plus-lighter;
    }

    .light {
        --today-card-text-color: var(--systemPrimary-onLight);
        --today-card-text-accent-color: var(--systemSecondary-onLight);
        --today-card-background-tint-color: rgba(255, 255, 255, 0.33);
        --today-card-text-accent-blend-mode: normal;
    }

    .media-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .media-container :global(img) {
        transition: transform 0.3s ease-out;
    }

    .today-card:hover .media-container :global(img) {
        transform: scale(1.05);
    }

    .wrapper {
        position: absolute;
        display: flex;
        width: 100%;
        height: 100%;
    }

    .information-layer {
        align-self: flex-end;
        width: 100%;
        display: flex;
        flex-direction: column;
    }

    .content-container {
        position: relative;
    }

    .protection-layer {
        --brightness: 0.95;
        position: absolute;
        width: 100%;
        height: calc(100% + var(--protection-layer-bottom-offset) + 60px);
        bottom: calc(-1 * var(--protection-layer-bottom-offset));
        background: var(--today-card-background-tint-color);
        backdrop-filter: blur(34px) brightness(var(--brightness)) saturate(1.6)
            contrast(1.1);
        mask-image: linear-gradient(
            to top,
            black 30%,
            rgba(0, 0, 0, 0.75) 70%,
            rgba(0, 0, 0, 0.4) 86%,
            transparent 100%
        );
        transition: backdrop-filter 210ms ease-in;
    }

    :global(.information-layer:has(> a:hover)) .protection-layer {
        --brightness: 0.88;
    }

    .title-container {
        position: relative;
        padding: 20px;
        color: var(--today-card-text-color);
    }

    .heading {
        font: var(--callout-emphasized);
        margin-bottom: 4px;
        mix-blend-mode: var(--today-card-text-accent-blend-mode);
        color: var(--today-card-text-accent-color);
        text-transform: uppercase;
    }

    h3 {
        font: var(--title-1-emphasized);
        text-wrap: pretty;
    }

    .lockup-footer {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: var(--today-card-background-tint-color);
        backdrop-filter: blur(34px) brightness(0.95) saturate(1.6) contrast(1.1);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        text-decoration: none;
        cursor: pointer;
        transition: background-color 0.2s ease;
    }

    .lockup-footer:hover {
        background: rgba(var(--systemTertiary-onDark-rgb, 120, 120, 128), 0.13);
    }

    .lockup-content {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        min-width: 0;
    }

    .lockup-info {
        flex: 1;
        min-width: 0;
    }

    .lockup-heading {
        font: var(--footnote);
        color: var(--systemSecondary-onDark);
        text-transform: uppercase;
        margin-bottom: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .lockup-title {
        font: var(--subhead-emphasized);
        color: var(--systemPrimary-onDark);
        margin-bottom: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .lockup-subtitle {
        font: var(--footnote);
        color: var(--systemSecondary-onDark);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .view-button {
        flex-shrink: 0;
        padding: 6px 16px;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 9999px;
        color: var(--systemPrimary-onDark);
        font: var(--subhead-bold);
        line-height: 1.2;
    }
</style>
