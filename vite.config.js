import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/profitpath/' : '/',
  esbuild: {
    loader: 'jsx',
    include: /assets\/app\.jsx$/,
    jsxFactory: 'h',
    jsxFragment: 'Fragment'
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.jsx': 'jsx' },
      jsxFactory: 'h',
      jsxFragment: 'Fragment'
    }
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
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    esbuild: {
      loader: 'jsx',
      include: /assets\/app\.jsx$/,
      jsxFactory: 'h',
      jsxFragment: 'Fragment'
    },
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
    port: 3000,
    host: true,
    hmr: {
      overlay: true
    },
    watch: {
      usePolling: true
    }
  }
})