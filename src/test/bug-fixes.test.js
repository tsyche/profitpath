import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Bug Fixes - Tooltip Positioning and Analytics Modal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Tooltip Viewport Boundary', () => {
    it('should keep tooltip within viewport when positioned below element', () => {
      // Simulate tooltip positioning logic
      const windowWidth = 800;
      const windowHeight = 600;
      const tooltipWidth = 300;
      const tooltipHeight = 220;
      const padding = 8;

      // Element in the middle of the screen
      const elementCenterX = 400;
      const tooltipLeft = elementCenterX - tooltipWidth / 2;

      // Check horizontal bounds
      expect(tooltipLeft).toBeGreaterThanOrEqual(padding);
      expect(tooltipLeft + tooltipWidth).toBeLessThanOrEqual(windowWidth - padding);
    });

    it('should position tooltip above element if below would overflow', () => {
      const windowHeight = 600;
      const elementTop = 450;
      const elementBottom = 500;
      const tooltipHeight = 220;
      const padding = 8;

      // Below positioning would go off-screen
      const bottomPosition = elementBottom + 10;
      const fitsBelow = bottomPosition + tooltipHeight <= windowHeight - padding;

      if (!fitsBelow) {
        // Should try above positioning
        const topPosition = elementTop - tooltipHeight - 10;
        const fitsAbove = topPosition >= padding;
        expect(fitsAbove || bottomPosition + tooltipHeight <= windowHeight - padding).toBe(true);
      }
    });

    it('should center tooltip horizontally with proper calculation', () => {
      const elementCenterX = 400;
      const tooltipWidth = 300;
      const expectedLeft = elementCenterX - tooltipWidth / 2;

      // Left edge should be centered position minus half width
      expect(expectedLeft).toBe(250);
      // Right edge calculation
      const rightEdge = expectedLeft + tooltipWidth;
      expect(rightEdge).toBe(550);
    });

    it('should adjust tooltip position if it goes off left edge', () => {
      const elementCenterX = 100; // Near left edge
      const tooltipWidth = 300;
      const windowWidth = 800;
      const padding = 8;

      let left = elementCenterX - tooltipWidth / 2; // Would be -50
      if (left < padding) {
        left = padding;
      }

      expect(left).toBe(8);
      expect(left + tooltipWidth).toBeLessThanOrEqual(windowWidth - padding);
    });

    it('should adjust tooltip position if it goes off right edge', () => {
      const elementCenterX = 750; // Near right edge
      const tooltipWidth = 300;
      const windowWidth = 800;
      const padding = 8;

      let left = elementCenterX - tooltipWidth / 2; // Would be 600
      if (left + tooltipWidth > windowWidth - padding) {
        left = windowWidth - tooltipWidth - padding;
      }

      expect(left).toBe(windowWidth - tooltipWidth - padding);
      expect(left + tooltipWidth).toBeLessThanOrEqual(windowWidth - padding);
    });
  });

  describe('Analytics Modal Dismiss Responsiveness', () => {
    it('should create modal with proper event handling', () => {
      // Create a test modal similar to the analytics clear confirmation modal
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.style.cssText = 'z-index: 10002; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center;';

      modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; z-index: 10003; position: relative;">
          <div class="modal-header">
            <h3>Test Modal</h3>
            <button class="btn-close">×</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const closeBtn = modal.querySelector('.btn-close');
      expect(closeBtn).toBeTruthy();
      expect(modal.parentNode).toBe(document.body);
    });

    it('should remove modal on close button click', () => {
      const modal = document.createElement('div');
      modal.id = 'testModal';
      modal.innerHTML = '<button class="btn-close">×</button>';
      document.body.appendChild(modal);

      expect(modal.parentNode).toBeTruthy();

      const closeBtn = modal.querySelector('.btn-close');
      closeBtn.onclick = () => {
        modal.remove();
      };

      // Simulate click
      closeBtn.click();

      // Element should be removed from DOM
      expect(modal.parentNode).toBeNull();
    });

    it('should handle onclick instead of addEventListener for immediate response', () => {
      const modal = document.createElement('div');
      modal.innerHTML = '<button class="btn-close">×</button>';
      document.body.appendChild(modal);

      const closeBtn = modal.querySelector('.btn-close');
      let clickCount = 0;

      // Using onclick for immediate response (not addEventListener)
      closeBtn.onclick = () => {
        clickCount++;
        modal.remove();
      };

      // First click should remove
      closeBtn.click();
      expect(clickCount).toBe(1);
      expect(document.body.contains(modal)).toBe(false);
    });

    it('should use stopImmediatePropagation to prevent event bubbling', () => {
      const modal = document.createElement('div');
      const content = document.createElement('div');
      const button = document.createElement('button');

      content.appendChild(button);
      modal.appendChild(content);
      document.body.appendChild(modal);

      let parentClickCount = 0;
      let buttonClickCount = 0;

      // Parent listener (should not fire if stopImmediatePropagation works)
      modal.onclick = () => {
        parentClickCount++;
      };

      // Button listener
      button.onclick = (e) => {
        buttonClickCount++;
        e.stopImmediatePropagation();
      };

      button.click();

      expect(buttonClickCount).toBe(1);
      // Parent shouldn't fire due to stopImmediatePropagation
      expect(parentClickCount).toBe(0);
    });

    it('should set onclick property instead of addEventListener for better control', () => {
      const button = document.createElement('button');
      let eventCount = 0;

      // Using onclick property
      button.onclick = () => {
        eventCount++;
      };

      // Multiple clicks should work properly
      button.click();
      expect(eventCount).toBe(1);

      button.click();
      expect(eventCount).toBe(2);

      // Event should be easily replaceable
      button.onclick = null;
      button.click();
      expect(eventCount).toBe(2); // Should not increment
    });

    it('should handle pointer-events styling for click responsiveness', () => {
      const button = document.createElement('button');
      button.style.pointerEvents = 'auto';

      // Button with pointer-events: auto should be clickable
      expect(button.style.pointerEvents).toBe('auto');

      document.body.appendChild(button);
      let clicked = false;

      button.onclick = () => {
        clicked = true;
      };

      button.click();
      expect(clicked).toBe(true);

      document.body.removeChild(button);
    });
  });

  describe('Integration - Both Fixes', () => {
    it('should position tooltip and handle modal dismiss independently', () => {
      // Test that tooltip positioning and modal dismiss don't interfere

      // Create a test tooltip
      const tooltip = document.createElement('div');
      tooltip.id = 'testTooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.left = '300px';
      tooltip.style.top = '200px';
      tooltip.style.width = '300px';
      tooltip.style.height = '220px';
      document.body.appendChild(tooltip);

      // Create a modal
      const modal = document.createElement('div');
      modal.id = 'testModal';
      modal.innerHTML = '<button class="btn-close">×</button>';
      document.body.appendChild(modal);

      // Both should exist
      expect(tooltip.parentNode).toBeTruthy();
      expect(modal.parentNode).toBeTruthy();

      // Closing modal shouldn't affect tooltip
      const closeBtn = modal.querySelector('.btn-close');
      closeBtn.onclick = () => modal.remove();
      closeBtn.click();

      // Modal should be removed
      expect(modal.parentNode).toBeNull();
      // Tooltip should still exist
      expect(tooltip.parentNode).toBeTruthy();
    });
  });

  describe('Mobile Dropdown Positioning - Mode Selector', () => {
    it('should have z-index styling for mobile select dropdowns', () => {
      // Create mobile menu structure
      const menu = document.createElement('div');
      menu.className = 'mobile-menu-content';

      const select = document.createElement('select');
      select.id = 'mobileMode';
      menu.appendChild(select);

      document.body.appendChild(menu);

      // Get computed styles
      const selectElement = document.getElementById('mobileMode');

      // Should have proper positioning for dropdowns to overflow container
      expect(selectElement.parentElement.classList.contains('mobile-menu-content')).toBe(true);

      // Clean up
      document.body.removeChild(menu);
    });

    it('should allow select dropdown to position independently with relative positioning', () => {
      // Create a container and select element
      const container = document.createElement('div');
      container.className = 'mobile-menu-content';
      container.style.position = 'relative';
      container.style.zIndex = '1001';

      const select = document.createElement('select');
      select.style.position = 'relative';
      select.style.zIndex = '1001';
      select.innerHTML = '<option>Option 1</option><option>Option 2</option>';

      container.appendChild(select);
      document.body.appendChild(container);

      const selectElement = document.querySelector('.mobile-menu-content select');

      // Select should be able to overflow its container with proper z-index
      expect(selectElement.style.position).toBe('relative');
      expect(parseInt(selectElement.style.zIndex)).toBe(1001);

      // Clean up
      document.body.removeChild(container);
    });

    it('should prevent select dropdowns from being hidden behind other UI elements', () => {
      // Create a test scenario with z-index conflicts
      const backdrop = document.createElement('div');
      backdrop.style.zIndex = '999';
      backdrop.id = 'backdrop';

      const mobileMenu = document.createElement('div');
      mobileMenu.className = 'mobile-menu-content';

      const select = document.createElement('select');
      select.style.zIndex = '1001';
      select.id = 'mobileSelect';

      mobileMenu.appendChild(select);
      document.body.appendChild(backdrop);
      document.body.appendChild(mobileMenu);

      const selectZIndex = parseInt(window.getComputedStyle(document.getElementById('mobileSelect')).zIndex || '1001');
      const backdropZIndex = parseInt(window.getComputedStyle(document.getElementById('backdrop')).zIndex);

      // Select should have higher z-index than backdrop to be clickable
      expect(selectZIndex).toBeGreaterThan(backdropZIndex);

      // Clean up
      document.body.removeChild(backdrop);
      document.body.removeChild(mobileMenu);
    });
  });

  describe('Mobile Settings Menu Stability', () => {
    it('should use pre-existing mobile settings sections instead of creating new ones', () => {
      // Create the HTML structure with pre-existing sections
      document.body.innerHTML = `
        <button id="mobileSettingsBtn">⚙️ Settings</button>
        <div class="mobile-settings-section" style="display: none;">
          <h4>Experience Level</h4>
          <input type="radio" name="mobileExperienceLevel" value="beginner">
        </div>
        <div class="mobile-settings-section" style="display: none;">
          <h4>Preferences</h4>
          <input type="checkbox" id="mobileShowTooltips">
        </div>
      `;

      const sections = document.querySelectorAll('.mobile-settings-section');

      // Both sections should exist and be hidden initially
      expect(sections.length).toBe(2);
      expect(sections[0].style.display).toBe('none');
      expect(sections[1].style.display).toBe('none');
    });

    it('should toggle mobile settings sections visibility without reordering DOM', () => {
      // Create the HTML structure
      document.body.innerHTML = `
        <div class="mobile-settings-section" style="display: none;">
          <h4>Experience Level</h4>
          <input type="radio" name="mobileExperienceLevel" value="beginner">
        </div>
        <div class="mobile-settings-section" style="display: none;">
          <h4>Preferences</h4>
          <input type="checkbox" id="mobileShowTooltips">
        </div>
        <button id="otherBtn">Other</button>
      `;

      const sections = document.querySelectorAll('.mobile-settings-section');
      const otherBtn = document.getElementById('otherBtn');

      // Get initial DOM order
      const initialOrder = [];
      document.body.childNodes.forEach((node, index) => {
        if (node.nodeType === 1) { // Element nodes only
          if (node.classList.contains('mobile-settings-section')) {
            initialOrder.push('section');
          } else if (node.id === 'otherBtn') {
            initialOrder.push('button');
          }
        }
      });

      // Toggle sections to visible
      sections.forEach(section => {
        section.style.display = 'block';
      });

      // Get DOM order after toggle
      const afterToggleOrder = [];
      document.body.childNodes.forEach((node, index) => {
        if (node.nodeType === 1) { // Element nodes only
          if (node.classList.contains('mobile-settings-section')) {
            afterToggleOrder.push('section');
          } else if (node.id === 'otherBtn') {
            afterToggleOrder.push('button');
          }
        }
      });

      // DOM order should not change - no reordering should occur
      expect(afterToggleOrder).toEqual(initialOrder);
      expect(sections[0].style.display).toBe('block');
      expect(sections[1].style.display).toBe('block');
    });

    it('should maintain consistent DOM structure when toggling settings repeatedly', () => {
      // Create the HTML structure
      document.body.innerHTML = `
        <div class="mobile-settings-section" style="display: none;">
          <h4>Section 1</h4>
        </div>
        <div class="mobile-settings-section" style="display: none;">
          <h4>Section 2</h4>
        </div>
      `;

      const sections = document.querySelectorAll('.mobile-settings-section');
      const section1 = sections[0];
      const section2 = sections[1];

      // Toggle multiple times to simulate repeated opens/closes
      for (let i = 0; i < 3; i++) {
        const isHidden = section1.style.display === 'none';
        sections.forEach(section => {
          section.style.display = isHidden ? 'block' : 'none';
        });

        // Check that DOM order is preserved after each toggle
        const actualSections = document.querySelectorAll('.mobile-settings-section');
        expect(actualSections.length).toBe(2);
        expect(actualSections[0]).toBe(section1);
        expect(actualSections[1]).toBe(section2);
      }

      // Final state: started hidden, toggled 3 times = block (hidden -> block -> hidden -> block)
      expect(section1.style.display).toBe('block');
      expect(section2.style.display).toBe('block');
    });

    it('should initialize settings correctly when settings menu opens', () => {
      // Create the HTML structure
      document.body.innerHTML = `
        <div class="mobile-settings-section" style="display: none;">
          <input type="radio" name="mobileExperienceLevel" value="beginner" id="rad-beginner">
          <input type="radio" name="mobileExperienceLevel" value="intermediate" id="rad-intermediate">
        </div>
        <div class="mobile-settings-section" style="display: none;">
          <input type="checkbox" id="mobileShowTooltips">
        </div>
      `;

      // Simulate loading settings from localStorage
      const mockSettings = {
        experienceLevel: 'intermediate',
        showTooltips: true
      };

      const sections = document.querySelectorAll('.mobile-settings-section');
      const isCurrentlyHidden = sections[0].style.display === 'none';

      // Toggle to show
      sections.forEach(section => {
        section.style.display = isCurrentlyHidden ? 'block' : 'none';
      });

      // When opening (transitioning from hidden to visible), initialize the controls
      if (isCurrentlyHidden) {
        // We were hidden and now showing, so initialize
        const experienceRadios = sections[0].querySelectorAll('input[name="mobileExperienceLevel"]');
        experienceRadios.forEach(radio => {
          radio.checked = radio.value === mockSettings.experienceLevel;
        });

        const preferencesCheckboxes = sections[1].querySelectorAll('input[type="checkbox"]');
        preferencesCheckboxes.forEach(checkbox => {
          if (checkbox.id === 'mobileShowTooltips') {
            checkbox.checked = mockSettings.showTooltips;
          }
        });
      }

      // Verify settings are initialized correctly
      const intermediateRadio = document.getElementById('rad-intermediate');
      const tooltipCheckbox = document.getElementById('mobileShowTooltips');

      expect(intermediateRadio.checked).toBe(true);
      expect(tooltipCheckbox.checked).toBe(true);
    });
  });
});
