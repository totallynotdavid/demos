import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/demos/dev3pack2/",
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
    watch: { usePolling: true },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
});
