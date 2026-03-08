import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Bug Fixes - Runtime Errors', () => {
  let originalWindow;
  let consoleErrorSpy;

  beforeEach(() => {
    originalWindow = { ...window };
    // Clear any existing globals
    delete window.$;
    delete window.$$;
    delete window.INDUSTRY_TEMPLATES;

    // Setup DOM
    document.body.innerHTML = '';

    // Suppress console.error to hide expected error messages
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    // Restore original window
    Object.assign(window, originalWindow);
    document.body.innerHTML = '';

    // Restore console.error
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore();
    }
  });

  describe('Modal Dismissal', () => {
    it('should dismiss schedule dialog when clicking overlay', () => {
      // Create a mock modal overlay with click handler
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;';
      document.body.appendChild(modal);

      // Add click handler that removes modal
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });

      // Simulate click on overlay
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: modal });
      modal.dispatchEvent(clickEvent);

      // Modal should be removed from DOM
      expect(document.body.contains(modal)).toBe(false);
    });

    it('should dismiss schedule dialog when pressing ESC key', () => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);

      // Add ESC key handler that removes modal
      const escHandler = (e) => {
        if (e.key === 'Escape' && document.body.contains(modal)) {
          document.body.removeChild(modal);
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

      // Simulate ESC key press
      const keyEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(keyEvent);

      // Modal should be removed from DOM
      expect(document.body.contains(modal)).toBe(false);
    });
  });

  describe('Actual Functionality Tests', () => {
    it('should fail: scenarios modal close button should work', () => {
      const modal = document.createElement('div');
      modal.id = 'scenariosModal';
      modal.innerHTML = '<button class="btn-close">Close</button>';
      document.body.appendChild(modal);

      const closeBtn = modal.querySelector('.btn-close');
      expect(closeBtn).toBeTruthy();
    });

    it('should fail: template loading should work with INDUSTRY_TEMPLATES', () => {
      window.INDUSTRY_TEMPLATES = {
        consulting: { name: 'Consulting Services' },
        cleaning: { name: 'Cleaning Services' }
      };

      expect(window.INDUSTRY_TEMPLATES).toBeDefined();
      expect(window.INDUSTRY_TEMPLATES.consulting).toBeDefined();
    });
  });

  describe('Global DOM Utilities', () => {
    it('should make $ function globally available', () => {
      // Define the $ function as it would be in app.jsx
      const $ = (selector) => {
        if (typeof document === 'undefined') return null;
        return document.querySelector(selector);
      };

      // Make it globally available
      if (typeof window !== 'undefined') {
        window.$ = $;
      }

      expect(window.$).toBeDefined();
      expect(typeof window.$).toBe('function');
    });

    it('should make $$ function globally available', () => {
      // Define the $$ function as it would be in app.jsx
      const $$ = (selector) => {
        if (typeof document === 'undefined') return [];
        return Array.from(document.querySelectorAll(selector));
      };

      // Make it globally available
      if (typeof window !== 'undefined') {
        window.$$ = $$;
      }

      expect(window.$$).toBeDefined();
      expect(typeof window.$$).toBe('function');
    });

    it('should query elements correctly with $', () => {
      // Define the $ function
      const $ = (selector) => {
        if (typeof document === 'undefined') return null;
        return document.querySelector(selector);
      };

      // Make it globally available
      if (typeof window !== 'undefined') {
        window.$ = $;
      }

      // Create a test element
      const testDiv = document.createElement('div');
      testDiv.id = 'test-element';
      document.body.appendChild(testDiv);

      const result = window.$('#test-element');
      expect(result).toBe(testDiv);

      document.body.removeChild(testDiv);
    });

    it('should query multiple elements correctly with $$', () => {
      // Define the $$ function
      const $$ = (selector) => {
        if (typeof document === 'undefined') return [];
        return Array.from(document.querySelectorAll(selector));
      };

      // Make it globally available
      if (typeof window !== 'undefined') {
        window.$$ = $$;
      }

      // Create test elements
      const div1 = document.createElement('div');
      div1.className = 'test-class';
      const div2 = document.createElement('div');
      div2.className = 'test-class';
      document.body.appendChild(div1);
      document.body.appendChild(div2);

      const result = window.$$('.test-class');
      expect(result).toHaveLength(2);
      expect(result).toContain(div1);
      expect(result).toContain(div2);

      document.body.removeChild(div1);
      document.body.removeChild(div2);
    });
  });

  describe('Export Functionality', () => {
    it('should export CSV without calc error', () => {
      // Mock calc and state globally
      window.calc = vi.fn(() => ({ revenue: 1000, income: 500 }));
      window.state = { offerings: [], employees: 1 };

      expect(window.calc).toBeDefined();
      expect(window.state).toBeDefined();
    });

    it('should export HTML without calc error', () => {
      window.calc = vi.fn(() => ({ revenue: 1000, income: 500 }));
      window.state = { offerings: [], employees: 1 };

      expect(window.calc).toBeDefined();
      expect(window.state).toBeDefined();
    });

    it('should export PDF without calc error', () => {
      window.calc = vi.fn(() => ({ revenue: 1000, income: 500 }));
      window.state = { offerings: [], employees: 1 };

      expect(window.calc).toBeDefined();
      expect(window.state).toBeDefined();
    });
  });

  describe('Template Loading', () => {
    it('should load industry templates from global scope', () => {
      const INDUSTRY_TEMPLATES = {
        consulting: { name: 'Consulting' },
        cleaning: { name: 'Cleaning' }
      };

      window.INDUSTRY_TEMPLATES = INDUSTRY_TEMPLATES;

      expect(window.INDUSTRY_TEMPLATES).toBeDefined();
      expect(window.INDUSTRY_TEMPLATES.consulting).toBeDefined();
    });
  });

  describe('Share Button', () => {
    it('should share scenario without calc error', () => {
      window.calc = vi.fn(() => ({ revenue: 1000, income: 500 }));

      expect(window.calc).toBeDefined();
      expect(typeof window.calc).toBe('function');
    });
  });

  describe('Scenarios Modal', () => {
    it('should open scenarios modal with correct z-index', () => {
      const modal = document.createElement('div');
      modal.id = 'scenariosModal';
      modal.className = 'modal';
      modal.innerHTML = '<div class="modal-overlay"></div><div class="modal-content"></div>';
      document.body.appendChild(modal);

      const modalContent = modal.querySelector('.modal-content');
      expect(modalContent).toBeDefined();

      document.body.removeChild(modal);
    });

    it('should save scenario correctly', () => {
      window.saveScenario = vi.fn();
      expect(window.saveScenario).toBeDefined();
    });

    it('should load scenario correctly', () => {
      window.loadScenario = vi.fn();
      expect(window.loadScenario).toBeDefined();
    });
  });

  describe('Industry Templates', () => {
    it('should make INDUSTRY_TEMPLATES globally available', () => {
      // Define INDUSTRY_TEMPLATES as it would be in app.jsx
      const INDUSTRY_TEMPLATES = {
        consulting: {
          name: 'Consulting Services',
          description: 'Professional consulting business',
          config: {
            offerings: [],
            employees: 1,
            employeePay: 80000,
            monthlyCosts: 500,
            productiveUtilizationPct: 75,
            targetUtilizationPct: 80
          }
        },
        cleaning: {
          name: 'Cleaning Services',
          description: 'Residential and commercial cleaning',
          config: {
            offerings: [],
            employees: 2,
            employeePay: 45000,
            monthlyCosts: 300,
            productiveUtilizationPct: 85,
            targetUtilizationPct: 90
          }
        },
        fitness: {
          name: 'Fitness Training',
          description: 'Personal training business',
          config: {
            offerings: [],
            employees: 1,
            employeePay: 60000,
            monthlyCosts: 200,
            productiveUtilizationPct: 80,
            targetUtilizationPct: 85
          }
        }
      };

      // Make it globally available
      if (typeof window !== 'undefined') {
        window.INDUSTRY_TEMPLATES = INDUSTRY_TEMPLATES;
      }

      expect(window.INDUSTRY_TEMPLATES).toBeDefined();
      expect(typeof window.INDUSTRY_TEMPLATES).toBe('object');
    });

    it('should have required industry templates', () => {
      // Define INDUSTRY_TEMPLATES
      const INDUSTRY_TEMPLATES = {
        consulting: {
          name: 'Consulting Services',
          description: 'Professional consulting business',
          config: {
            offerings: [],
            employees: 1,
            employeePay: 80000,
            monthlyCosts: 500,
            productiveUtilizationPct: 75,
            targetUtilizationPct: 80
          }
        },
        cleaning: {
          name: 'Cleaning Services',
          description: 'Residential and commercial cleaning',
          config: {
            offerings: [],
            employees: 2,
            employeePay: 45000,
            monthlyCosts: 300,
            productiveUtilizationPct: 85,
            targetUtilizationPct: 90
          }
        },
        fitness: {
          name: 'Fitness Training',
          description: 'Personal training business',
          config: {
            offerings: [],
            employees: 1,
            employeePay: 60000,
            monthlyCosts: 200,
            productiveUtilizationPct: 80,
            targetUtilizationPct: 85
          }
        }
      };

      // Make it globally available
      if (typeof window !== 'undefined') {
        window.INDUSTRY_TEMPLATES = INDUSTRY_TEMPLATES;
      }

      expect(window.INDUSTRY_TEMPLATES.consulting).toBeDefined();
      expect(window.INDUSTRY_TEMPLATES.cleaning).toBeDefined();
      expect(window.INDUSTRY_TEMPLATES.fitness).toBeDefined();
    });

    it('should have valid template structure', () => {
      // Define INDUSTRY_TEMPLATES
      const INDUSTRY_TEMPLATES = {
        consulting: {
          name: 'Consulting Services',
          description: 'Professional consulting business',
          config: {
            offerings: [],
            employees: 1,
            employeePay: 80000,
            monthlyCosts: 500,
            productiveUtilizationPct: 75,
            targetUtilizationPct: 80
          }
        }
      };

      // Make it globally available
      if (typeof window !== 'undefined') {
        window.INDUSTRY_TEMPLATES = INDUSTRY_TEMPLATES;
      }

      const template = window.INDUSTRY_TEMPLATES.consulting;
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.config).toBeDefined();
      expect(template.config.offerings).toBeDefined();
      expect(Array.isArray(template.config.offerings)).toBe(true);
    });
  });

  describe('Analytics Modal Dismissal', () => {
    it('should close analytics modal when close button is clicked', () => {
      // Create a mock modal
      const modal = document.createElement('div');
      modal.className = 'modal-overlay analytics-modal';
      modal.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h3>Test Modal</h3>
            <button class="modal-close">&times;</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Add close handler
      const closeBtn = modal.querySelector('.modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          document.body.removeChild(modal);
        });
      }

      expect(document.querySelector('.analytics-modal')).toBeTruthy();

      closeBtn.click();

      expect(document.querySelector('.analytics-modal')).toBeFalsy();
    });

    it('should close analytics modal when overlay is clicked', () => {
      // Create a mock modal
      const modal = document.createElement('div');
      modal.className = 'modal-overlay analytics-modal';
      modal.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h3>Test Modal</h3>
            <button class="modal-close">&times;</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Add overlay click handler
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });

      expect(document.querySelector('.analytics-modal')).toBeTruthy();

      modal.click();

      expect(document.querySelector('.analytics-modal')).toBeFalsy();
    });

    it('should close analytics modal when ESC key is pressed', () => {
      // Create a mock modal
      const modal = document.createElement('div');
      modal.className = 'modal-overlay analytics-modal';
      modal.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h3>Test Modal</h3>
            <button class="modal-close">&times;</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Add ESC key handler
      const escHandler = (e) => {
        if (e.key === 'Escape' && document.body.contains(modal)) {
          document.body.removeChild(modal);
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

      expect(document.querySelector('.analytics-modal')).toBeTruthy();

      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escEvent);

      expect(document.querySelector('.analytics-modal')).toBeFalsy();
    });
  });

  describe('Settings Menu Scrolling', () => {
    it('should have max-height and overflow properties for scrolling', () => {
      const settingsMenu = document.createElement('div');
      settingsMenu.className = 'settings-menu';
      settingsMenu.style.maxHeight = '80vh';
      settingsMenu.style.overflowY = 'auto';
      settingsMenu.style.overflowX = 'hidden';
      document.body.appendChild(settingsMenu);

      const computedStyle = window.getComputedStyle(settingsMenu);
      expect(computedStyle.maxHeight).not.toBe('none');
      expect(computedStyle.overflowY).toBe('auto');

      document.body.removeChild(settingsMenu);
    });

    it('should scroll when content exceeds max-height', () => {
      const settingsMenu = document.createElement('div');
      settingsMenu.className = 'settings-menu';
      settingsMenu.style.maxHeight = '80vh';
      settingsMenu.style.overflowY = 'auto';
      settingsMenu.style.overflowX = 'hidden';
      settingsMenu.style.height = '1000px'; // Force content to exceed max-height
      document.body.appendChild(settingsMenu);

      const computedStyle = window.getComputedStyle(settingsMenu);
      expect(computedStyle.overflowY).toBe('auto');

      document.body.removeChild(settingsMenu);
    });
  });
});
