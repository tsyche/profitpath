import tseslint from 'typescript-eslint';

const globals = {
  '$': 'readonly',
  '$$': 'readonly',
  'state': 'writable',
  'vi': 'readonly',
  'describe': 'readonly',
  'it': 'readonly',
  'expect': 'readonly',
  'beforeEach': 'readonly',
  'afterEach': 'readonly',
  'beforeAll': 'readonly',
  'afterAll': 'readonly',
  // External libraries loaded dynamically
  'XLSX': 'readonly',
  'html2canvas': 'readonly',
  // Browser globals
  'document': 'readonly',
  'window': 'readonly',
  'console': 'readonly',
  'setTimeout': 'readonly',
  'setInterval': 'readonly',
  'clearTimeout': 'readonly',
  'clearInterval': 'readonly',
  'localStorage': 'readonly',
  'sessionStorage': 'readonly',
  'navigator': 'readonly',
  'location': 'readonly',
  'history': 'readonly',
  'fetch': 'readonly',
  'URL': 'readonly',
  'Blob': 'readonly',
  'FileReader': 'readonly',
  'FormData': 'readonly',
  'HTMLElement': 'readonly',
  'Element': 'readonly',
  'Node': 'readonly',
  'NodeList': 'readonly',
  'HTMLCollection': 'readonly',
  'Event': 'readonly',
  'CustomEvent': 'readonly',
  'DOMParser': 'readonly',
  'XMLHttpRequest': 'readonly',
  'WebSocket': 'readonly',
  'Worker': 'readonly',
  'ServiceWorker': 'readonly',
  'Cache': 'readonly',
  'caches': 'readonly',
  'self': 'readonly',
  'alert': 'readonly',
  'confirm': 'readonly',
  'prompt': 'readonly',
  'performance': 'readonly',
  'requestAnimationFrame': 'readonly',
  'cancelAnimationFrame': 'readonly',
  'getComputedStyle': 'readonly',
  'MutationObserver': 'readonly',
  'IntersectionObserver': 'readonly',
  'ResizeObserver': 'readonly',
  'MouseEvent': 'readonly',
  'KeyboardEvent': 'readonly',
  'TouchEvent': 'readonly',
  'URLSearchParams': 'readonly',
  'Intl': 'readonly',
  'btoa': 'readonly',
  'atob': 'readonly',
  'crypto': 'readonly',
  'globalThis': 'readonly',
  'process': 'readonly',
  'global': 'writable'
};

export default [
  {
    // Only config-adjacent plain JS remains (public/sw.js); everything else is TypeScript
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals
    },
    rules: {
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
      'no-console': ['warn', { 'allow': ['warn', 'error'] }],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      // Recommended rules from eslint:recommended
      'no-duplicate-imports': 'error',
      'no-useless-catch': 'error',
      'no-constant-condition': 'warn',
      'no-empty': 'warn',
      'no-extra-boolean-cast': 'warn',
      'no-extra-semi': 'error',
      'no-inner-declarations': 'error',
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-loss-of-precision': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-obj-calls': 'error',
      'no-redeclare': 'error',
      'no-regex-spaces': 'error',
      'no-sparse-arrays': 'warn',
      'no-unexpected-multiline': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error'
    }
  },
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: ['**/*.ts'] })),
  {
    files: ['**/*.ts'],
    languageOptions: { globals },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    // Test files: console.log is fine for debugging, unused vars are common in mocks/fixtures
    files: ['src/test/**/*.{js,ts}', 'src/**/*.test.{js,ts}', 'tests/**/*.{js,ts}', 'tests/**/*.spec.{js,ts}'],
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    // Ambient declarations: `any` is how untyped CDN libs and legacy globals are declared
    files: ['**/*.d.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' }
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      'node-v20.5.1-darwin-x64/',
      'android/',
      'ios/',
      'playwright-report/',
      'test-results/',
      '*.config.js',
      '*.config.ts',
      'coverage/',
      '.nyc_output/',
      'tmp/',
      'temp/'
    ]
  }
];
