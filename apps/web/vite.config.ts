import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const serverPort = parseInt(env.PORT) || 3456;
  const vitePort = parseInt(env.VITE_PORT) || 5173;

  return {
    root: 'src/client',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src/client"),
      },
    },
    build: {
      outDir: '../../dist/client',
      emptyOutDir: true,
    },
    server: {
      port: vitePort,
      proxy: {
        '/api': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
        },
        '/ws': {
          target: `ws://localhost:${serverPort}`,
          ws: true,
        },
      },
    },
  };
});
