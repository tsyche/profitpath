import { defineConfig } from 'vite'

export default defineConfig({
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
    isolate: false,
    pool: 'threads',
    singleThread: true
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