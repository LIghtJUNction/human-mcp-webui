import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function gitCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export default defineConfig({
  base: "/mcp/",
  define: {
    __APP_COMMIT__: JSON.stringify(gitCommit())
  },
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
