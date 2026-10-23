import { defineConfig } from "vite";

export default defineConfig({
  root: "apps/miniapp",
  build: { outDir: "../../dist", emptyOutDir: true },
  server: { port: 5173 }
});
