import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { config } from 'dotenv'

config({ path: '.env.local' })

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
      include: [
        'src/lib/**/*.ts',
        'src/config/**/*.ts',
        'src/lib/auth/**/*.ts',
      ],
      exclude: [
        'src/lib/supabase.ts',
        'src/lib/server/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})