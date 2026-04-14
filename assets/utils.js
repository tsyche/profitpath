// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export function uuid() {
  // RFC4122-ish v4 fallback.
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) bytes[i] = bytes[i] ?? Math.floor(Math.random() * 256);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function safeParseNumber(value, defaultValue = 0, minVal = null, maxVal = null) {
  // Enhanced input validation
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  // Convert to string and trim whitespace
  const strValue = String(value).trim();

  // Handle empty strings
  if (strValue === '') {
    return defaultValue;
  }

  const num = Number(strValue);

  // Check for invalid numbers (NaN, Infinity, etc.)
  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }

  // Apply bounds checking
  if (minVal !== null && maxVal !== null) return clamp(num, minVal, maxVal);
  if (minVal !== null) return Math.max(num, minVal);
  if (maxVal !== null) return Math.min(num, maxVal);
  return num;
}

export function sanitizeNumericInput(value, options = {}) {
  const {
    defaultValue = 0,
    min = -Infinity,
    max = Infinity,
    allowNegative = true,
    allowZero = true,
    precision = 2
  } = options;

  let sanitized = safeParseNumber(value, defaultValue, min, max);

  // Additional validation rules
  if (!allowNegative && sanitized < 0) {
    sanitized = Math.abs(sanitized) || defaultValue;
  }

  if (!allowZero && sanitized === 0) {
    sanitized = defaultValue || 0.01; // Small positive value
  }

  // Round to specified precision
  if (precision >= 0) {
    sanitized = Number(sanitized.toFixed(precision));
  }

  return sanitized;
}

export function cssEscape(s) {
  return s.replace(/([\\:\[\]"'!#$%&()*+,./;<=>?@^`{|}~])/g, '\\$1');
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function fmtInt(n) {
  return Math.round(n || 0).toLocaleString();
}

export function fmtMoney0(n) {
  return `$${(n || 0).toFixed(0).toLocaleString()}`;
}

export function fmtMoney2(n) {
  return `$${(n || 0).toFixed(2).toLocaleString()}`;
}

export function fmtPct1(n) {
  return `${(n || 0).toFixed(1)}%`;
}
