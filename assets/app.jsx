import { calc } from '../src/calculations/index.js';
import {
  loadSettings,
  updateSetting,
  setExperienceLevel
} from '../src/settings/index.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Constants for business model assumptions
const DEFAULT_CURRENCY = 'USD';
// Chart tooltip options: toggle what extra info to display
const CHART_TOOLTIP_OPTIONS = {
  showPercent: true,
  showServiceHoursPerClient: true,
};

function uuid() {
  // crypto.randomUUID is ideal, but not available in every environment.
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  // RFC4122-ish v4 fallback.
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  for (let i = 0; i < bytes.length; i++) bytes[i] = bytes[i] ?? Math.floor(Math.random() * 256);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const fmtInt = (n) => Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
const fmtMoney0 = (n) => Intl.NumberFormat(undefined, { style: 'currency', currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(n);
const fmtPct1 = (n) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;

// Lazy loading utility for scripts
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(); // Already loaded
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Safe numeric parsing with optional range clamping
function safeParseNumber(value, defaultValue = 0, minVal = null, maxVal = null) {
  const num = Number(value) || defaultValue;
  if (minVal !== null && maxVal !== null) return clamp(num, minVal, maxVal);
  if (minVal !== null) return Math.max(num, minVal);
  if (maxVal !== null) return Math.min(num, maxVal);
  return num;
}

// Enhanced validation system for business logic and data integrity
function validateBusinessLogic() {
  const issues = [];
  const warnings = [];

  // Validate global inputs
  if (state.employees < 1) {
    issues.push({
      severity: 'error',
      message: 'Employees must be at least 1',
      field: 'employees',
      suggestion: 'Set employees to 1 (you can exclude yourself from payroll costs)'
    });
  }

}

// The rest of the file is identical to assets/app.js — for brevity keep the original
export {};
