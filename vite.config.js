import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  base: process.env.GITHUB_PAGES ? '/profitpath/' : '/',
  // Custom `h` factory for assets/app.jsx; .ts files use the default oxc transform
  oxc: {
    jsx: { runtime: 'classic', pragma: 'h', pragmaFrag: 'Fragment' }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  },
  test: {
    environment: 'jsdom',
    // Unit tests only; tests/e2e belongs to Playwright
    include: ['src/**/*.{test,spec}.{js,ts}'],
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    reporters: ['verbose'],
    outputColor: false,
    silent: false,
    hideStackTrace: false,
    testTimeout: 10000,
    hookTimeout: 10000,
    // Isolate test files: shared module state (mocked document, window.state,
    // localStorage) leaks between files otherwise and causes order-dependent
    // failures
    isolate: true,
    pool: 'threads'
  },
  server: {
    port: 3120,
    strictPort: true,
    host: true,
    hmr: {
      overlay: true
    },
    watch: {
      usePolling: true
    }
  }
})