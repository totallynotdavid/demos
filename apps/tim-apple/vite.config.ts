import path from "node:path";
import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

const deadLinks = new Set([
  "/games",
  "/apps",
  "/terms",
  "/policy",
  "/collection/social",
  "/collection/streaming",
]);

export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter(),
      preprocess: vitePreprocess(),
      prerender: {
        handleHttpError: ({ path, message }) => {
          if (!deadLinks.has(path)) throw new Error(message);
        },
      },
    }),
  ],
  resolve: {
    alias: {
      $lib: path.resolve(import.meta.dirname, "src/lib"),
    },
  },
});
