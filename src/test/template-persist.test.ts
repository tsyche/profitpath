import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadIndustryTemplate } from '../../assets/services/miscService';

describe('loadIndustryTemplate persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    window.INDUSTRY_TEMPLATES = {
      demo: { config: { offerings: [{ name: 'Consulting', priceMonthly: 100 }] } },
    };
    window.state = { offerings: [] };
    window.render = vi.fn();
    window.persistState = vi.fn();
  });

  afterEach(() => {
    delete window.INDUSTRY_TEMPLATES;
    delete window.state;
    delete window.render;
    delete window.persistState;
    localStorage.clear();
  });

  it('saves app state through the app persistState, not a stray storage key', () => {
    loadIndustryTemplate('demo');

    expect(window.persistState).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('undefined')).toBeNull();
  });
});
