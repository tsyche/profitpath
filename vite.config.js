import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
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
  }
})