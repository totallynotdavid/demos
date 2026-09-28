import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const base = process.argv.includes("dev") ? "" : "/demos/tim-apple";

// Links in the mock data and footer that have no route.
const deadLinks = new Set(
  [
    "/games",
    "/apps",
    "/terms",
    "/policy",
    "/collection/social",
    "/collection/streaming",
  ].map((path) => base + path),
);

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({ pages: "dist", assets: "dist" }),
    paths: { base },
    prerender: {
      handleHttpError: ({ path, message }) => {
        if (!deadLinks.has(path)) throw new Error(message);
      },
    },
  },
};

export default config;
