/// <reference types="vitest" />

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    dir: './src',
    exclude: ['**/node_modules/**', '**/*.browser.test.tsx'], // geometry runs in a real browser instead
  },
})
