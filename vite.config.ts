import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Import Vitest types for configuration
import type { UserConfig as VitestUserConfigInterface } from 'vitest/config';

// https://vitejs.dev/config/

// Explicitly type the Vitest config part
const vitestConfig: VitestUserConfigInterface['test'] = {
  globals: true, // Optional: if you want to use Vitest globals like describe, it, expect without importing
  environment: 'node', // Or 'jsdom' if you test frontend components that need a DOM
  setupFiles: ['./vitest.setup.ts'], // Path to your setup file
};

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  test: vitestConfig, // Add the Vitest configuration here
});
