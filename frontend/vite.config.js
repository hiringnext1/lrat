import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file from the parent directory of frontend
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const backendPort = env.PORT || 3001;

  return {
    plugins: [react()],
    // In production, frontend is served by Express from /frontend/dist
    // So relative paths work without any base config needed.
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
        '/socket.io': {
          target: `http://localhost:${backendPort}`,
          ws: true,
        },
      },
    },
    build: {
      // Raise chunk size warning to 1MB to avoid noise during build
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Split vendor libraries into separate chunks for better caching
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
            motion: ['framer-motion'],
            flow: ['@xyflow/react'],
          },
        },
      },
    },
  };
});
