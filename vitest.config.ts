/// <reference types="vitest" />

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    // geometry runs in a real browser instead; the Worker runs in workerd (vitest.workers.config.ts)
    exclude: ['**/node_modules/**', '**/*.browser.test.tsx', 'src/party/scopa.test.ts'],
  },
})
