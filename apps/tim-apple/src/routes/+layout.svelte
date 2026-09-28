<script lang="ts">
import Footer from "$lib/components/layout/Footer.svelte";
import Navigation from "$lib/components/layout/Navigation.svelte";

import "../app.scss";
</script>

<div class="app-container">
    <div class="navigation-container">
        <Navigation />
    </div>

    <div class="main-wrapper">
        <main>
            <slot />
        </main>
        <Footer />
    </div>
</div>

<style>
    .app-container {
        min-height: 100vh;
        display: grid;
        grid-template-rows: 44px auto;
        grid-template-columns: minmax(0, 1fr);
    }

    .main-wrapper {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        position: relative;
    }

    main {
        flex-grow: 1;
    }

    @media (min-width: 768px) {
        .app-container {
            grid-template-columns: 260px 1fr;
            grid-template-rows: auto;
        }
        .navigation-container {
            position: sticky;
            top: 0;
            height: 100vh;
        }
    }
</style>
