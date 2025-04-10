import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: process.env.NODE_ENV === 'development', // Only generate source maps in development
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large dependencies into separate chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover'],
          'map-vendor': ['leaflet'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase the warning limit
  },
  server: {
    hmr: {
      timeout: 60000, // Increase timeout to 60 seconds
    },
    proxy: {
      // Add proxy configuration if needed for API calls
      // '/api': 'http://localhost:3000',
    },
  },
  optimizeDeps: {
    exclude: [], // Exclude problematic dependencies if needed
  },
});