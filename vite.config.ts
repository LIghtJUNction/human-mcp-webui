import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/mcp/",
  plugins: [react()],
  server: {
    proxy: {
      "/mcp/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mcp/, ""),
        ws: true
      }
    }
  }
});

