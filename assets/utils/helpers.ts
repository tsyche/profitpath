// Utility functions

export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function safeParseNumber(value: unknown, defaultValue = 0) {
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? defaultValue : parsed;
}

// Clamp a number into [min, max]. Single source of truth — previously copy-pasted
// into four modules, and one missing copy silently broke the Auto-balance Mix % feature.
export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function cssEscape(str: string) {
  return str.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
}

export function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/** Message from an unknown caught value. */
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Stack (or string form) from an unknown caught value. */
export function errStack(e: unknown): string {
  return e instanceof Error && e.stack ? e.stack : String(e);
}
