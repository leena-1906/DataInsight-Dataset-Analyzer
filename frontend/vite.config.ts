import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Target for local Vite dev proxy: respects VITE_BACKEND_URL or extracts origin from VITE_API_URL
  const backendUrl =
    env.VITE_BACKEND_URL ||
    (env.VITE_API_URL ? env.VITE_API_URL.replace(/\/api\/?$/, "") : "") ||
    "http://localhost:4000";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true
        }
      }
    }
  };
});
