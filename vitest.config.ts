import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // Allows using Vitest globals like describe, it, expect without importing
    environment: 'jsdom', // Simulates a browser environment for tests
    setupFiles: ['./src/setupTests.ts'], // Optional: './vitest.setup.ts' for global test setup (e.g., mocks)
    include: ['src/**/*.test.{ts,tsx}'], // Glob pattern for test files
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // For UI mode: `pnpm test:ui`
    ui: true,
    // Disable automatically opening the browser when running non-UI tests
    open: false,
  },
});
