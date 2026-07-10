import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    target: "es2022",
    rollupOptions: {
      input: {
        app: resolve(__dirname, "index.html"),
        site: resolve(__dirname, "site/index.html"),
      },
    },
  },
});
