/// <reference types="vitest" />

import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  test: {
    setupFiles: './src/setupTests.ts',
    include: ['src/**/*.browser.test.tsx'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(), // installed vitest (4.1.11) requires the provider factory, not the 'playwright' string from the brief
      instances: [{ browser: 'chromium' }],
    },
  },
})
