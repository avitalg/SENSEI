/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Default 3110; a harness-assigned PORT (preview tooling) wins, and without
  // strictPort a second session auto-increments instead of failing to start.
  server: { port: Number(process.env.PORT) || 3110 },
  preview: { port: 3110 },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    globals: true,
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary'],
      // Focus coverage on the logic that unit/regression tests target — the
      // pure utils, store, hooks, nav, and data. Presentational pages are
      // exercised by the route smoke + a11y suites, not line-covered here.
      include: ['src/utils/**', 'src/store/**', 'src/hooks/**', 'src/nav/**', 'src/data/**'],
      // Ratcheted to lock in the coverage actually achieved (stmts/lines ~96%,
      // branches ~88%, funcs ~85%) with a small buffer against run-to-run noise.
      // The gate now fails on EROSION, not just on falling under a loose floor —
      // new logic must ship with tests to keep these numbers up. Raise, never
      // lower, when coverage climbs.
      thresholds: { statements: 92, branches: 84, functions: 80, lines: 92 },
    },
  },
})
