import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";

const isDev = process.argv.includes("dev");

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: [".svelte", ".md", ".svx"],
  preprocess: [vitePreprocess(), mdsvex({ extensions: [".md", ".svx"] })],
  vitePlugin: {
    inspector: isDev
      ? {
          toggleKeyCombo: "control-shift",
          holdMode: true,
          showToggleButton: "always",
        }
      : false,
  },
  kit: {
    adapter: adapter(),
  },
};

export default config;
