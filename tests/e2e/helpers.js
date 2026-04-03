import { expect } from '@playwright/test';

/**
 * Wait for the page to be fully loaded and ready for testing
 */
export async function waitForPageReady(page) {
  // Wait for DOM to be ready
  await page.waitForLoadState('domcontentloaded');

  // Wait for key elements to be visible
  try {
    await Promise.race([
      page.waitForSelector('#employees', { timeout: 5000 }),
      page.waitForSelector('.logo-link', { timeout: 5000 }),
      page.waitForSelector('h1', { timeout: 5000 })
    ]);
  } catch (e) {
    // If elements aren't found, wait a bit and continue
    await page.waitForTimeout(1000);
  }

  // Additional wait for any dynamic content
  await page.waitForTimeout(500);

  // Close onboarding dialog if present - may need multiple attempts
  for (let i = 0; i < 3; i++) {
    await closeOnboardingIfPresent(page);
    await page.waitForTimeout(300);

    // Check if overlay is gone
    const overlayGone = await page.evaluate(() => {
      const overlay = document.querySelector('.onboarding-dialog-overlay');
      return !overlay;
    });

    if (overlayGone) {
      break;
    }
  }

  // Extra wait to ensure page is fully interactive
  await page.waitForTimeout(1500);
}

/**
 * Close onboarding/welcome dialogs if they appear
 */
export async function closeOnboardingIfPresent(page) {
  try {
    // Forcefully remove any onboarding overlays to prevent test blocking
    await page.evaluate(() => {
      // Remove the overlay element entirely from DOM
      const overlay = document.querySelector('.onboarding-dialog-overlay');
      if (overlay) {
        overlay.remove();
      }

      // Also try to remove any other modal overlays that might exist
      const modals = document.querySelectorAll('[class*="overlay"], [class*="modal"][class*="open"]');
      modals.forEach(modal => {
        if (modal !== overlay && modal.style.zIndex > 1000) {
          modal.remove();
        }
      });
    });

    await page.waitForTimeout(300);
  } catch (e) {
    // If removal fails, continue anyway - tests might still work
  }
}

/**
 * Wait for calculations to complete
 */
export async function waitForCalculations(page) {
  // Wait for any loading indicators to disappear
  try {
    await page.waitForSelector('.loading, .spinner', { state: 'hidden', timeout: 2000 }).catch(() => {});
  } catch (e) {
    // Continue if no loading indicator found
  }
  
  // Wait a bit for calculations to settle
  await page.waitForTimeout(500);
}

/**
 * Fill form inputs safely with validation
 */
export async function safeFill(page, selector, value) {
  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: 3000 });
    await element.clear();
    await element.fill(value);
    
    // Trigger change event if needed
    await element.dispatchEvent('input');
    await element.dispatchEvent('change');
    
    await page.waitForTimeout(100); // Small delay for React to update
  } catch (e) {
    console.warn(`Failed to fill ${selector} with ${value}:`, e.message);
  }
}

/**
 * Click button safely with multiple fallback selectors
 */
export async function safeClick(page, selectors) {
  if (typeof selectors === 'string') {
    selectors = [selectors];
  }
  
  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        await element.click();
        await page.waitForTimeout(200);
        return true;
      }
    } catch (e) {
      // Try next selector
    }
  }
  
  console.warn(`Could not click any of these selectors: ${selectors.join(', ')}`);
  return false;
}

/**
 * Get text content safely
 */
export async function safeGetText(page, selector) {
  try {
    const element = page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout: 3000 });
    return await element.textContent();
  } catch (e) {
    console.warn(`Could not get text from ${selector}:`, e.message);
    return null;
  }
}

/**
 * Check if element exists and is visible
 */
export async function isElementVisible(page, selector) {
  try {
    const element = page.locator(selector).first();
    return await element.isVisible({ timeout: 2000 });
  } catch (e) {
    return false;
  }
}
