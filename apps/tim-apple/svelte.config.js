import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// Links in the mock data and footer that have no route.
const deadLinks = new Set([
  "/games",
  "/apps",
  "/terms",
  "/policy",
  "/collection/social",
  "/collection/streaming",
]);

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({ pages: "dist", assets: "dist" }),
    paths: { relative: false },
    prerender: {
      handleHttpError: ({ path, message }) => {
        if (!deadLinks.has(path)) throw new Error(message);
      },
    },
  },
};

export default config;
