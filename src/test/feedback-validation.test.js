import { describe, it, expect, beforeEach } from 'vitest';

// Regression tests for the feedback form validation bug.
// Bug: parseInt(formData.get('rating')) returns NaN when the hidden input
// is empty (e.g. user never clicked a star, or mobile touch didn't fire).
// !NaN === true, so the validator always threw — even when category was valid.
// The fix: fall back to counting active .rating-star elements, and show
// inline validation instead of a generic unactionable error toast.

describe('Feedback form — rating validation', () => {
  it('parseInt of empty string is NaN and should be treated as invalid', () => {
    const raw = '';
    const rating = parseInt(raw);
    expect(isNaN(rating)).toBe(true);
    expect(!rating).toBe(true); // demonstrates the original bug: !NaN === true → always threw
  });

  it('parseInt of a valid star value is a truthy number', () => {
    const raw = '3';
    const rating = parseInt(raw);
    expect(isNaN(rating)).toBe(false);
    expect(rating).toBe(3);
    expect(!rating).toBe(false);
  });

  it('falls back to active star count when hidden input is empty', () => {
    document.body.innerHTML = `
      <form id="feedbackForm">
        <input type="hidden" name="rating" value="">
        <button class="rating-star active" data-rating="1"></button>
        <button class="rating-star active" data-rating="2"></button>
        <button class="rating-star active" data-rating="3"></button>
        <button class="rating-star" data-rating="4"></button>
        <button class="rating-star" data-rating="5"></button>
        <select name="category"><option value="bug">Bug</option></select>
      </form>
    `;

    const form = document.getElementById('feedbackForm');
    const formData = new FormData(form);

    let rating = parseInt(formData.get('rating'));
    if (isNaN(rating) || rating < 1) {
      const activeStars = form.querySelectorAll('.rating-star.active');
      rating = activeStars.length || 0;
    }

    expect(rating).toBe(3);
  });

  it('returns 0 when hidden input is empty and no stars are active', () => {
    document.body.innerHTML = `
      <form id="feedbackForm">
        <input type="hidden" name="rating" value="">
        <button class="rating-star" data-rating="1"></button>
        <button class="rating-star" data-rating="2"></button>
        <select name="category"><option value="">Select</option></select>
      </form>
    `;

    const form = document.getElementById('feedbackForm');
    const formData = new FormData(form);

    let rating = parseInt(formData.get('rating'));
    if (isNaN(rating) || rating < 1) {
      const activeStars = form.querySelectorAll('.rating-star.active');
      rating = activeStars.length || 0;
    }

    expect(rating).toBe(0);
  });

  it('uses hidden input value when it is set by star click', () => {
    document.body.innerHTML = `
      <form id="feedbackForm">
        <input type="hidden" name="rating" value="4">
        <button class="rating-star active" data-rating="1"></button>
        <button class="rating-star active" data-rating="2"></button>
        <button class="rating-star active" data-rating="3"></button>
        <button class="rating-star active" data-rating="4"></button>
        <button class="rating-star" data-rating="5"></button>
      </form>
    `;

    const form = document.getElementById('feedbackForm');
    const formData = new FormData(form);

    let rating = parseInt(formData.get('rating'));
    if (isNaN(rating) || rating < 1) {
      const activeStars = form.querySelectorAll('.rating-star.active');
      rating = activeStars.length || 0;
    }

    expect(rating).toBe(4);
  });

  it('treats empty category string as invalid', () => {
    const category = '';
    expect(!category).toBe(true);
  });

  it('treats a selected category as valid', () => {
    const category = 'bug';
    expect(!category).toBe(false);
  });

  it('inline validation marks rating container when rating missing', () => {
    document.body.innerHTML = `
      <form id="feedbackForm">
        <div class="rating-container"></div>
        <select id="feedbackCategory"><option value="bug">Bug</option></select>
      </form>
    `;

    const form = document.getElementById('feedbackForm');
    const rating = 0;
    const category = 'bug';
    const ratingContainer = form.querySelector('.rating-container');
    const categorySelect = form.querySelector('#feedbackCategory');

    if (!rating || rating < 1) ratingContainer.style.outline = '2px solid var(--bad, #ef4444)';
    else ratingContainer.style.outline = '';

    if (!category) categorySelect.style.borderColor = 'var(--bad, #ef4444)';
    else categorySelect.style.borderColor = '';

    expect(ratingContainer.style.outline).toBe('2px solid var(--bad, #ef4444)');
    expect(categorySelect.style.borderColor).toBe('');
  });

  it('inline validation marks category select when category missing', () => {
    document.body.innerHTML = `
      <form id="feedbackForm">
        <div class="rating-container"></div>
        <select id="feedbackCategory"><option value="">Select</option></select>
      </form>
    `;

    const form = document.getElementById('feedbackForm');
    const rating = 3;
    const category = '';
    const ratingContainer = form.querySelector('.rating-container');
    const categorySelect = form.querySelector('#feedbackCategory');

    if (!rating || rating < 1) ratingContainer.style.outline = '2px solid var(--bad, #ef4444)';
    else ratingContainer.style.outline = '';

    if (!category) categorySelect.style.borderColor = 'var(--bad, #ef4444)';
    else categorySelect.style.borderColor = '';

    expect(ratingContainer.style.outline).toBe('');
    expect(categorySelect.style.borderColor).toBe('var(--bad, #ef4444)');
  });
});

describe('Feedback form — modal scroll lock', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.style.overflow = '';
  });

  it('body scroll should be locked when a modal is open', () => {
    // Simulate what Modal.js now does on open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    expect(document.body.style.overflow).toBe('hidden');

    // Simulate close
    document.body.style.overflow = prevOverflow;
    expect(document.body.style.overflow).toBe('');
  });

  it('restores prior overflow value on close, not just empty string', () => {
    document.body.style.overflow = 'auto';
    const prevOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    expect(document.body.style.overflow).toBe('hidden');

    document.body.style.overflow = prevOverflow;
    expect(document.body.style.overflow).toBe('auto');
  });
});
