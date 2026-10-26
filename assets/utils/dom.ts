/** Tiny DOM query helpers shared by the app shell and its panels. */

// Deliberately loose legacy lookups (~50 callers rely on it); new code uses $opt/$req below.
/* eslint-disable @typescript-eslint/no-explicit-any */
export const $ = (selector: string): any => {
  if (typeof document === 'undefined') return null;
  return document.querySelector(selector);
};

export const $$ = (selector: string): any[] => {
  if (typeof document === 'undefined') return [];
  return Array.from(document.querySelectorAll(selector));
};

/* eslint-enable @typescript-eslint/no-explicit-any */

/** Typed lookup that may miss: `T | null`. Defaults to an input, the most common target. */
export const $opt = <T extends HTMLElement = HTMLInputElement>(selector: string): T | null => {
  if (typeof document === 'undefined') return null;
  return document.querySelector<T>(selector);
};

/** Typed lookup for elements that ship in index.html: throws a named error instead of a late null dereference. */
export const $req = <T extends HTMLElement = HTMLInputElement>(selector: string): T => {
  const el = $opt<T>(selector);
  if (!el) throw new Error('Missing element: ' + selector);
  return el;
};
