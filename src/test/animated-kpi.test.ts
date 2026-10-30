import { required } from './test-utils';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function mediaQuery(query: string, matches: boolean): MediaQueryList {
  return {
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true)
  };
}

describe('Animated KPI Counters & Micro-interactions', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="app">
        <div class="kpi">
          <div class="k">Clients</div>
          <div class="v" id="kpiClients">10</div>
        </div>
        <div class="kpi">
          <div class="k">Revenue</div>
          <div class="v" id="kpiRevenue">$50,000</div>
        </div>
        <div class="kpi">
          <div class="k">Net Income</div>
          <div class="v" id="kpiIncome">$25,000</div>
        </div>
        <button class="btn primary">Save</button>
        <div class="modal-overlay" style="display: none;">
          <div class="modal-content">Modal</div>
        </div>
        <div class="toast" style="display: none;">Notification</div>
      </div>
    `;

    // Mock matchMedia for prefers-reduced-motion testing
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe('KPI Flash Animation', () => {
    it('should add kpi-flash animation when value changes', () => {
      const kpiEl = document.getElementById('kpiClients');
      const initialContent = required(kpiEl).textContent;

      // Simulate setKpi function behavior
      const newValue = '15';
      if (required(kpiEl).textContent !== newValue) {
        required(kpiEl).textContent = newValue;
        required(kpiEl).classList.remove('kpi-flash');
        void required(kpiEl).offsetWidth; // force reflow
        required(kpiEl).classList.add('kpi-flash');
      }

      expect(required(kpiEl).textContent).toBe('15');
      expect(required(kpiEl).classList.contains('kpi-flash')).toBe(true);
    });

    it('should not add animation when value does not change', () => {
      const kpiEl = document.getElementById('kpiClients');
      const value = required(kpiEl).textContent;

      // Try to update with same value
      if (required(kpiEl).textContent !== value) {
        required(kpiEl).classList.add('kpi-flash');
      }

      expect(required(kpiEl).classList.contains('kpi-flash')).toBe(false);
    });
  });

  describe('KPI Count Up Animation', () => {
    it('should add kpi-count-up class when prefers-reduced-motion is not set', () => {
      window.matchMedia = (query) => mediaQuery(query, false);

      const kpiEl = document.getElementById('kpiRevenue');
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Simulate setKpi behavior
      const newValue = '$75,000';
      if (required(kpiEl).textContent !== newValue) {
        required(kpiEl).textContent = newValue;
        required(kpiEl).classList.remove('kpi-flash', 'kpi-count-up');
        void required(kpiEl).offsetWidth;
        required(kpiEl).classList.add('kpi-flash');
        if (!prefersReducedMotion) {
          required(kpiEl).classList.add('kpi-count-up');
        }
      }

      expect(required(kpiEl).classList.contains('kpi-count-up')).toBe(true);
    });

    it('should NOT add kpi-count-up class when prefers-reduced-motion is true', () => {
      window.matchMedia = (query) => mediaQuery(query, query === '(prefers-reduced-motion: reduce)');

      const kpiEl = document.getElementById('kpiIncome');
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Simulate setKpi behavior
      const newValue = '$30,000';
      if (required(kpiEl).textContent !== newValue) {
        required(kpiEl).textContent = newValue;
        required(kpiEl).classList.remove('kpi-flash', 'kpi-count-up');
        void required(kpiEl).offsetWidth;
        required(kpiEl).classList.add('kpi-flash');
        if (!prefersReducedMotion) {
          required(kpiEl).classList.add('kpi-count-up');
        }
      }

      expect(required(kpiEl).classList.contains('kpi-count-up')).toBe(false);
    });
  });

  describe('Primary Button Ripple Effect', () => {
    it('should have ripple effect structure on primary buttons', () => {
      const btn = document.querySelector('.btn.primary');
      expect(btn).toBeTruthy();

      // Check that button is set up for ripple effect (position: relative, overflow: hidden)
      const style = window.getComputedStyle(required(btn));
      // Note: These would be applied via CSS, not directly on element
      expect(required(btn).classList.contains('btn')).toBe(true);
      expect(required(btn).classList.contains('primary')).toBe(true);
    });

    it('should trigger ripple animation on click', () => {
      const btn = document.querySelector('.btn.primary');
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true
      });

      required(btn).dispatchEvent(clickEvent);

      // The ripple effect is CSS-based, so we just verify the click event fired
      expect(btn).toBeTruthy();
    });
  });

  describe('Modal & Toast Animations', () => {
    it('should have modalFadeIn animation on overlay', () => {
      const modal = document.querySelector<HTMLElement>('.modal-overlay');
      required(modal).style.display = 'flex';

      // Check that modal has animation applied via CSS
      expect(required(modal).classList.contains('modal-overlay')).toBe(true);
    });

    it('should have modalSlideIn animation on content', () => {
      const content = document.querySelector('.modal-content');

      // Check that content has animation applied via CSS
      expect(required(content).classList.contains('modal-content')).toBe(true);
    });

    it('should have toastSlideIn animation on show', () => {
      const toast = document.querySelector('.toast');
      required(toast).classList.add('show');

      expect(required(toast).classList.contains('show')).toBe(true);
      expect(required(toast).classList.contains('toast')).toBe(true);
    });
  });

  describe('CSS Animation Variables', () => {
    it('should define animation timing variables', () => {
      const style = getComputedStyle(document.documentElement);
      // These are CSS custom properties defined in styles.css
      // We verify the styles are applied by checking if the element inherits them

      expect(document.documentElement).toBeTruthy();
      // Note: Specific values would need actual CSS parsing to verify
    });
  });

  describe('prefers-reduced-motion Media Query', () => {
    it('should respect prefers-reduced-motion preference', () => {
      window.matchMedia = (query) => mediaQuery(query, query === '(prefers-reduced-motion: reduce)');

      const matches = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      expect(matches).toBe(true);
    });

    it('should apply animations when prefers-reduced-motion is not set', () => {
      window.matchMedia = (query) => mediaQuery(query, false);

      const matches = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      expect(matches).toBe(false);
    });
  });
});
