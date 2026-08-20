import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 离线单文件包构建：同一套组件构建为单个 IIFE，不产生动态 import 与
// 外链资源，供 scripts/package-offline.mjs 内联进单个 HTML（双击即开）。
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: "offline-dist",
    emptyOutDir: true,
    target: "es2018",
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    reportCompressedSize: false,
    rollupOptions: {
      input: fileURLToPath(new URL("./offline/entry.tsx", import.meta.url)),
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "app.js",
        assetFileNames: "app.[ext]",
      },
    },
  },
});
