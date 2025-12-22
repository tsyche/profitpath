#!/usr/bin/env node

const esbuild = require('esbuild');
const path = require('path');

// Build configuration
const config = {
  entryPoints: ['assets/app.js'],
  bundle: true,
  outfile: 'dist/app.min.js',
  minify: true,
  sourcemap: true,
  target: 'es2017',
  loader: {
    '.ts': 'ts',
    '.js': 'js'
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
};

// Development build (no minification, with watch)
const devConfig = {
  ...config,
  outfile: 'dist/app.js',
  minify: false,
  watch: true
};

const isDev = process.argv.includes('--dev') || process.argv.includes('--watch');

async function build() {
  try {
    const result = await esbuild.build(isDev ? devConfig : config);

    if (isDev) {
      console.log('🚀 Development build started with watch mode');
      console.log('📁 Output: dist/app.js');
    } else {
      console.log('✅ Production build completed');
      console.log(`📦 Bundle size: ${result.metafile ? 'Check dist/app.min.js' : 'Unknown'}`);
      console.log('📁 Output: dist/app.min.js');
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
