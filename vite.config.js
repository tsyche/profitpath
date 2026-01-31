import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  esbuild: {
    loader: { '.js': 'jsx' },
    jsxFactory: 'h',
    jsxFragment: 'Fragment'
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
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
  server: {
    port: 3000,
    host: true,
    hmr: {
      overlay: true
    },
    watch: {
      usePolling: true
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js']
  }
})