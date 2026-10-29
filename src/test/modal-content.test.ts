import { afterEach, expect, it } from 'vitest';
import { createModal } from '../../assets/components/Modal';

afterEach(() => document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove()));

it('mounts element content without serializing it and preserves its event handlers', () => {
  const content = document.createElement('div');
  const button = document.createElement('button');
  button.textContent = 'Preview example';
  let clicked = false;
  button.addEventListener('click', () => { clicked = true; });
  content.appendChild(button);
  const overlay = createModal({ title: 'Example preview', content });
  expect(overlay.querySelector('.modal-body')?.firstElementChild).toBe(content);
  overlay.querySelector<HTMLButtonElement>('.modal-body button')!.click();
  expect(clicked).toBe(true);
  overlay.querySelector<HTMLButtonElement>('.modal-close')!.click();
});

it('names the modal for assistive technology and returns focus to its opener', () => {
  const opener = document.createElement('button');
  document.body.appendChild(opener);
  opener.focus();
  const overlay = createModal({ title: 'Review example', content: '<p>Example assumptions</p>' });
  const dialog = overlay.querySelector<HTMLElement>('[role="dialog"]')!;
  expect(dialog).not.toBeNull();
  expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Review example');
  overlay.querySelector<HTMLButtonElement>('.modal-close')!.click();
  expect(document.activeElement).toBe(opener);
  opener.remove();
});
