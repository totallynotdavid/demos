import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({ pages: "dist", assets: "dist" }),
    paths: {
      base: process.argv.includes("dev") ? "" : "/demos/tim-apple",
    },
    prerender: {
      // The navigation links to /games, /apps, /terms and /policy, which have no route.
      handleHttpError: "warn",
    },
  },
};

export default config;
