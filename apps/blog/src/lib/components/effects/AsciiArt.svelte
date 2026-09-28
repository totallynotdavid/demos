<script lang="ts">
import { onMount } from "svelte";
import {
  createVisibilityObserver,
  markAnimationsShown,
  shouldShowAnimations,
} from "$lib/utils/animation";

let { art, topic }: { art: string; topic: string } = $props();

let visible = $state("");
let isStreaming = $state(false);
let container: HTMLElement;

onMount(() => {
  if (!shouldShowAnimations()) {
    visible = art;
    return;
  }

  const observer = createVisibilityObserver(() => {
    startStreaming();
    markAnimationsShown();
    observer.disconnect();
  });

  observer.observe(container);

  return () => observer.disconnect();
});

function startStreaming() {
  isStreaming = true;
  let index = 0;

  const interval = setInterval(() => {
    if (index < art.length) {
      visible += art[index];
      index++;
    } else {
      clearInterval(interval);
      isStreaming = false;
    }
  }, 5);
}
</script>

<div bind:this={container} class="ascii">
  <pre aria-label={`ASCII art for ${topic}`}>{visible}{#if isStreaming}<span class="cursor">|</span>{/if}</pre>
</div>

<style>
  .ascii {
    margin: 2rem 0;
  }

  pre {
    font-family: ui-monospace, monospace;
    white-space: pre;
    color: #888;
    line-height: 1.1;
    font-size: 0.8em;
    margin: 0;
  }

  .cursor {
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
</style>
