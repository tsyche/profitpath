/** Tiny DOM query helpers shared by the app shell and its panels. */

/** Nullable lookup typed as an input (the common target); use `$opt<T>` for other element types. */
export const $ = <T extends HTMLElement = HTMLInputElement>(selector: string): T | null => {
  if (typeof document === 'undefined') return null;
  return document.querySelector<T>(selector);
};

export const $$ = <T extends HTMLElement = HTMLInputElement>(selector: string): T[] => {
  if (typeof document === 'undefined') return [];
  return Array.from(document.querySelectorAll<T>(selector));
};

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
