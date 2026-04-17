import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**'],
    server: {
      deps: {
        // Inline next-auth/@auth/core so Vite transforms them. Without this,
        // tests that spy on @/lib/auth fail with "Cannot find module 'next/server'"
        // because next-auth's internals use a bare `next/server` specifier that
        // Vitest's Node ESM loader cannot resolve via package.json#exports.
        inline: ['next-auth', '@auth/core'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/components/ui/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
