<script lang="ts">
import { page } from "$app/state";
import { mockData } from "$lib/data/mock-data";
import NavigationItem from "./NavigationItem.svelte";

let menuOpen = false;

$: currentPath = page.url.pathname;
</script>

<nav class="navigation" class:is-expanded={menuOpen}>
    <div class="nav-header">
        <button
            class="menu-btn"
            on:click={() => (menuOpen = !menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
        >
            <span class="menuicon-bread menuicon-bread-top">
                <span class="menuicon-bread-crust menuicon-bread-crust-top"></span>
            </span>
            <span class="menuicon-bread menuicon-bread-bottom">
                <span
                    class="menuicon-bread-crust menuicon-bread-crust-bottom"
                ></span>
            </span>
        </button>

        <a href="/" class="logo" aria-label="App Store">
            <svg
                class="logo-icon"
                viewBox="0 0 32 32"
                role="img"
                aria-hidden="true"
            >
                <path
                    d="M31.32,10.23a1.19,1.19,0,0,0-1.14-.83H20.41l-2-6.32a1.2,1.2,0,0,0-2.26,0l-2,6.32H4.41a1.19,1.19,0,0,0-1.14.83,1.18,1.18,0,0,0,.35,1.29l5.5,4-2.13,6.53a1.2,1.2,0,0,0,1.75,1.43L16,19.33l7.25,4.15a1.2,1.2,0,0,0,1.75-1.43l-2.13-6.53,5.5-4A1.18,1.18,0,0,0,31.32,10.23Z"
                ></path>
            </svg>
            <span class="logo-text">App Store</span>
        </a>

        <a href="/search" class="search-link" aria-label="Search">
            <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
            >
                <path
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                />
            </svg>
        </a>
    </div>

    <div class="nav-content" aria-hidden={!menuOpen}>
        <ul class="nav-items">
            {#each mockData.navigation.tabs as tab}
                <li>
                    <NavigationItem {tab} active={currentPath === tab.url} />
                </li>
            {/each}
        </ul>
    </div>
</nav>

<style lang="scss">
    .navigation {
        background: var(--pageBg);
        z-index: 1000;
        display: flex;
        flex-direction: column;
    }

    .nav-header {
        display: grid;
        align-items: center;
        padding: 0 12px;
    }

    .logo {
        font: var(--title-2-emphasized);
        color: var(--systemPrimary);
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .logo-icon {
        width: 32px;
        height: 32px;
        fill: var(--keyColor);
    }

    /* Mobile */
    @media (max-width: 767px) {
        .navigation {
            position: sticky;
            top: 0;
            height: 44px;
            overflow: hidden;
            border-bottom: 1px solid var(--systemQuaternary);
            transition: height 0.56s cubic-bezier(0.52, 0.16, 0.24, 1);
        }

        .navigation.is-expanded {
            height: 100vh;
        }

        .nav-header {
            grid-template-columns: 1fr auto 1fr;
            height: 44px;
        }

        .logo {
            justify-self: center;
        }
        .logo-text {
            display: none;
        }

        .nav-content {
            padding-top: 23px;
        }

        .nav-items {
            padding: 3px 26px;
        }
    }

    /* Desktop */
    @media (min-width: 768px) {
        .navigation {
            height: 100vh;
            border-right: 1px solid var(--systemQuaternary);
        }

        .nav-header {
            grid-template-columns: 1fr auto;
            padding: 19px 25px 14px;
        }

        .search-link {
            color: var(--systemPrimary);
            justify-self: end;
        }

        .nav-items {
            padding: 0 20px 9px;
            font: var(--title-3);
        }

        .nav-content {
            overflow-y: auto;
            flex: 1;
        }
    }

    /* Menu Button */
    $shared-transition-duration: 0.1806s;
    $amp-nav-ease-blue: cubic-bezier(0.04, 0.04, 0.12, 0.96);

    .menu-btn {
        height: 44px;
        width: 44px;
        position: relative;
    }

    .menuicon-bread {
        height: 20px;
        left: 13px;
        position: absolute;
        top: 12px;
        width: 20px;
        transition: transform $shared-transition-duration $amp-nav-ease-blue;
    }

    .navigation.is-expanded .menuicon-bread {
        height: 24px;
        left: 10px;
        top: 11px;
        width: 24px;
        transition-delay: 0.1008s;
        transition-duration: 0.3192s;
    }

    .navigation.is-expanded .menuicon-bread-top {
        transform: rotate(-45deg);
    }
    .navigation.is-expanded .menuicon-bread-bottom {
        transform: rotate(45deg);
    }

    .menuicon-bread-crust {
        background: var(--keyColor);
        border-radius: 1px;
        display: block;
        height: 2px;
        position: absolute;
        transition: transform 0.1596s cubic-bezier(0.52, 0.16, 0.52, 0.84) 0.1008s;
        width: 20px;
    }

    .navigation.is-expanded .menuicon-bread-crust {
        width: 24px;
        transform: translateY(0);
        transition: transform $shared-transition-duration $amp-nav-ease-blue;
    }

    .menuicon-bread-crust-top {
        top: 9px;
        transform: translateY(-4px);
    }
    .navigation.is-expanded .menuicon-bread-crust-top {
        top: 11px;
    }
    .menuicon-bread-crust-bottom {
        bottom: 9px;
        transform: translateY(4px);
    }
    .navigation.is-expanded .menuicon-bread-crust-bottom {
        bottom: 11px;
    }
</style>
