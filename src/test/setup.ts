// Test setup file
import { afterEach, expect, vi } from 'vitest'
import { setRangeCase } from '../calculations/rangeCase'
import * as matchers from '@testing-library/jest-dom/matchers'

// extends Vitest's expect method with methods from jest-dom
expect.extend(matchers)

// The optimistic/conservative lens is module state; never let it leak between tests
afterEach(() => setRangeCase('base'))

// Mock browser APIs that might not be available in test environment
global.$ = (selector: string) => document.querySelector(selector)
global.$$ = (selector: string) => Array.from(document.querySelectorAll(selector))

// Mock localStorage
const localStorageMock: { _store: Record<string, string>; [k: string]: any } = {
  getItem: vi.fn((key: string) => {
    const store = localStorageMock._store || {};
    return store[key] !== undefined ? store[key] : null;
  }),
  setItem: vi.fn((key: string, value: string) => {
    if (!localStorageMock._store) localStorageMock._store = {};
    localStorageMock._store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
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
class MockURL {
  href: string
  pathname: string
  search: string
  constructor(url: string) {
    this.href = url
    this.pathname = url.split('?')[0]
    this.search = url.includes('?') ? '?' + url.split('?')[1] : ''
  }
  static createObjectURL = vi.fn(() => 'mock-object-url')
  static revokeObjectURL = vi.fn()
}
global.URL = MockURL as unknown as typeof URL

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
})

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid'),
    getRandomValues: vi.fn((array: Uint8Array) => array.fill(0)),
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
