<script lang="ts">
import { asset } from "$app/paths";
import Header from "$lib/components/layout/Header.svelte";

let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href="{asset('/favicon.svg')}" />
</svelte:head>

<div class="container">
  <Header />
  {@render children()}
  
  <footer>
    <p>
      Built with <a href="https://svelte.dev/">Svelte</a> · Powered by curiosity
    </p>
  </footer>
</div>

<style>
  @font-face {
    font-family: 'Kosugi';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url('@fontsource/kosugi/files/kosugi-latin-400-normal.woff2') format('woff2');
  }

  :global(body) {
    background-color: #fff;
    color: #000;
    font-family: 'Kosugi', sans-serif;
    font-size: 1.1rem;
    line-height: 1.6;
    margin: 0;
    padding: 2rem;
  }

  :global(h1, h2, h3, h4, h5, h6) {
    font-size: 1em;
    margin: 0;
    font-weight: normal;
  }

  :global(h1) {
    margin-top: 2rem;
    margin-bottom: 2rem;
  }

  :global(h2) {
    margin-top: 2rem;
    margin-bottom: 1rem;
  }

  :global(pre) {
    background-color: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 3px;
    padding: 1rem;
    overflow-x: auto;
    font-family: monospace;
    font-size: 0.9em;
    line-height: 1.4;
    margin: 1.5rem 0;
  }

  :global(code) {
    font-family: monospace;
    font-size: 0.9em;
  }

  :global(p code, li code) {
    background-color: #f5f5f5;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 0.85em;
  }

  :global(pre code) {
    background: none;
    padding: 0;
    border-radius: 0;
    font-size: 1em;
  }

  .container {
    max-width: 65ch;
    margin: 0 auto;
  }

  footer {
    margin-top: 4rem;
    padding-top: 2rem;
    border-top: 1px solid #e0e0e0;
    text-align: center;
  }

  footer p {
    font-size: 0.9em;
    color: #888;
  }

  footer a {
    color: inherit;
    text-decoration: none;
    transition: color 0.2s;
  }

  footer a:hover {
    color: #0000ff;
    text-decoration: underline;
  }
</style>
