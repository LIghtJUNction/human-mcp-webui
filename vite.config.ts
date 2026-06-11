import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function gitCommit() {
  try {
    return execSync("git -C . rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return process.env.GITHUB_SHA?.slice(0, 7) || "dev";
  }
}

export default defineConfig({
  base: "/",
  define: {
    __APP_COMMIT__: JSON.stringify(gitCommit())
  },
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        ws: true
      },
      "/mcp/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mcp/, ""),
        ws: true
      }
    }
  }
});
