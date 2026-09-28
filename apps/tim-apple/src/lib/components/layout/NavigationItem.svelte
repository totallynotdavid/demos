<script lang="ts">
import type { NavigationTab } from "$lib/types";

export let tab: NavigationTab;
export let active: boolean = false;
</script>

<a href={tab.url} class="nav-item" class:active>
    <span class="icon">{tab.icon}</span>
    <span class="label">{tab.label}</span>
</a>

<style>
    .nav-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px;
        border-radius: 6px;
        font: var(--title-2);
        color: var(--systemPrimary);
        text-decoration: none;
        transition: background-color 0.2s;
    }

    .nav-item:hover {
        background: var(--systemQuinary);
        text-decoration: none;
    }

    .nav-item.active {
        background: var(--navSidebarSelectedState);
        font-weight: 600;
    }

    .icon {
        font-size: 24px;
        width: 32px;
        height: 32px;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    @media (min-width: 768px) {
        .nav-item {
            font: var(--title-3);
        }
        .nav-item.active {
            font: var(--title-3-medium);
        }
        .icon {
            font-size: 20px;
            width: 24px;
            height: 24px;
        }
    }
</style>
