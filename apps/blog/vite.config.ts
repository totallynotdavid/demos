import path from "node:path";
import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";
import { defineConfig } from "vite";

const isDev = process.argv.includes("dev");

export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter(),
      extensions: [".svelte", ".md", ".svx"],
      preprocess: [vitePreprocess(), mdsvex({ extensions: [".md", ".svx"] })],
      inspector: isDev
        ? {
            toggleKeyCombo: "control-shift",
            holdMode: true,
            showToggleButton: "always",
          }
        : false,
    }),
  ],
  resolve: {
    alias: {
      $lib: path.resolve(import.meta.dirname, "src/lib"),
    },
  },
});
