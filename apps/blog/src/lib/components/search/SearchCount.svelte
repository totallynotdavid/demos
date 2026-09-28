<script lang="ts">
let { count, label = "results" }: { count: number; label?: string } = $props();

let visible = $derived(count > 0);
</script>

<div class="count" class:visible>
  <span class="value">{count}</span>
  <span class="label">{label}</span>
</div>

<style>
  .count {
    font-size: 0.875rem;
    font-family: monospace;
    color: #2563eb;
    font-weight: 600;
    opacity: 0;
    transform: translateX(-10px) scale(0.95);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
  }

  .count.visible {
    opacity: 1;
    transform: translateX(0) scale(1);
  }

  .value {
    font-variant-numeric: tabular-nums;
  }

  .label {
    margin-left: 0.25rem;
    font-weight: 500;
    color: #666;
  }
</style>
