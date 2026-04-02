import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { existsSync, readFileSync, writeFileSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "flatten-sidepanel-html",
      closeBundle() {
        // Move the sidepanel HTML to dist root so manifest.json can find it
        const src = resolve(__dirname, "dist/src/sidepanel/index.html");
        const dest = resolve(__dirname, "dist/sidepanel.html");
        if (existsSync(src)) {
          let html = readFileSync(src, "utf-8");
          // Fix relative paths from nested dir to root
          html = html.replace(/\.\.\/\.\.\/sidepanel\.js/, "./sidepanel.js");
          writeFileSync(dest, html);
        }
      },
    },
  ],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, "src/content/index.ts"),
        background: resolve(__dirname, "src/background/index.ts"),
        sidepanel: resolve(__dirname, "src/sidepanel/index.html"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
