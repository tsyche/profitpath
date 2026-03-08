// Test setup file
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers)

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

// Mock browser APIs that might not be available in test environment
global.$ = (selector) => document.querySelector(selector)
global.$$ = (selector) => Array.from(document.querySelectorAll(selector))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn((key) => {
    const store = localStorageMock._store || {};
    return store[key] !== undefined ? store[key] : null;
  }),
  setItem: vi.fn((key, value) => {
    if (!localStorageMock._store) localStorageMock._store = {};
    localStorageMock._store[key] = value;
  }),
  removeItem: vi.fn((key) => {
    if (localStorageMock._store) {
      delete localStorageMock._store[key];
    }
  }),
  clear: vi.fn(() => {
    localStorageMock._store = {};
  }),
  _store: {},
}
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
})

// Mock URL APIs
global.URL = class URL {
  constructor(url) {
    this.href = url
    this.pathname = url.split('?')[0]
    this.search = url.includes('?') ? '?' + url.split('?')[1] : ''
  }
}

global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = vi.fn()

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
})

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid'),
    getRandomValues: vi.fn((array) => array.fill(0)),
  },
  writable: true,
})

// Mock matchMedia
global.matchMedia = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(), // deprecated
  removeListener: vi.fn(), // deprecated
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))
