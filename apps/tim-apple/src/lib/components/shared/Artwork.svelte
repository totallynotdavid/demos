<script lang="ts">
export let artwork: { url: string; width: number; height: number };
export let alt: string = "";
</script>

<img
    src={artwork.url}
    {alt}
    style:aspect-ratio={artwork.width / artwork.height}
    loading="lazy"
/>

<style>
    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        border-radius: inherit;
    }
</style>
