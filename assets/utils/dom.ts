/** Tiny DOM query helpers shared by the app shell and its panels. */

export const $ = (selector: string): any => {
  if (typeof document === 'undefined') return null;
  return document.querySelector(selector);
};

export const $$ = (selector: string): any[] => {
  if (typeof document === 'undefined') return [];
  return Array.from(document.querySelectorAll(selector));
};
