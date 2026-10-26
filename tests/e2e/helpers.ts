import { expect, type Page } from '@playwright/test';

/**
 * Wait for the page to be fully loaded and ready for testing
 */
export async function waitForPageReady(page: Page) {
  // Wait for DOM to be ready
  await page.waitForLoadState('domcontentloaded');

  // Wait for key elements to be visible (current markup: app bar + inputs)
  try {
    await Promise.race([
      page.waitForSelector('.appbar', { timeout: 5000 }),
      page.waitForSelector('#fullTimeEmployees', { timeout: 5000 })
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
export async function closeOnboardingIfPresent(page: Page) {
  try {
    // Forcefully remove any onboarding overlays to prevent test blocking
    await page.evaluate(() => {
      // Remove the overlay element entirely from DOM
      const overlay = document.querySelector('.onboarding-dialog-overlay');
      if (overlay) {
        overlay.remove();
        window.releaseScrollLock?.();
      }

      // Also try to remove any other modal overlays that might exist
      const modals = document.querySelectorAll('[class*="overlay"], [class*="modal"][class*="open"]');
      modals.forEach(modal => {
        if (modal !== overlay && Number((modal as HTMLElement).style.zIndex) > 1000) {
          modal.remove();
          window.releaseScrollLock?.();
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
export async function waitForCalculations(page: Page) {
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
export async function safeFill(page: Page, selector: string, value: string) {
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
    console.warn(`Failed to fill ${selector} with ${value}:`, (e as Error).message);
  }
}

/**
 * Click button safely with multiple fallback selectors
 */
export async function safeClick(page: Page, selectors: string | string[]) {
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
export async function safeGetText(page: Page, selector: string) {
  try {
    const element = page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout: 3000 });
    return await element.textContent();
  } catch (e) {
    console.warn(`Could not get text from ${selector}:`, (e as Error).message);
    return null;
  }
}

/**
 * Check if element exists and is visible
 */
export async function isElementVisible(page: Page, selector: string) {
  try {
    const element = page.locator(selector).first();
    return await element.isVisible({ timeout: 2000 });
  } catch (e) {
    return false;
  }
}
