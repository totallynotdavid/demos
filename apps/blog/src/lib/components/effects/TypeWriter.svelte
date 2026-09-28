<script lang="ts">
import { onMount } from "svelte";
import {
  createVisibilityObserver,
  markAnimationsShown,
  shouldShowAnimations,
} from "$lib/utils/animation";

let {
  text,
  speed = 15,
  showCursor = true,
}: { text: string; speed?: number; showCursor?: boolean } = $props();

let visible = $state("");
let isTyping = $state(false);
let container: HTMLElement;

onMount(() => {
  if (!shouldShowAnimations()) {
    visible = text;
    return;
  }

  const observer = createVisibilityObserver(() => {
    startTyping();
    markAnimationsShown();
    observer.disconnect();
  });

  observer.observe(container);

  return () => observer.disconnect();
});

function startTyping() {
  isTyping = true;
  let index = 0;

  const interval = setInterval(() => {
    if (index < text.length) {
      visible += text[index];
      index++;
    } else {
      clearInterval(interval);
      isTyping = false;
    }
  }, speed);
}
</script>

<span bind:this={container} class="typewriter">
  <span class="content">{visible}</span>
  {#if showCursor && isTyping}
    <span class="cursor">|</span>
  {/if}
</span>

<style>
  .typewriter {
    display: inline-block;
  }

  .cursor {
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
</style>
