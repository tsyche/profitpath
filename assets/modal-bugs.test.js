// Test file for modal bug fixes
// This file will help ensure all modal issues are properly addressed

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../assets/services/modalService.js', () => ({
    showConfirmationModal: vi.fn(),
    showToast: vi.fn()
}));

vi.mock('../assets/components/UIHelpers.js', () => ({
    renderScenariosList: vi.fn(),
    populateComparisonDropdowns: vi.fn(),
    showDeleteConfirmation: vi.fn()
}));

describe('Modal Bug Fixes', () => {
    let originalBodyOverflow;

    beforeEach(() => {
        // Save original body overflow
        originalBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'visible';

        // Clear any existing modals
        document.querySelectorAll('.modal-overlay, .modal, .feedback-modal, .analytics-modal').forEach(el => el.remove());
    });

    afterEach(() => {
        // Restore original body overflow
        document.body.style.overflow = originalBodyOverflow;

        // Clean up any remaining modals
        document.querySelectorAll('.modal-overlay, .modal, .feedback-modal, .analytics-modal').forEach(el => el.remove());
    });

    describe('1. Modal Background Issues', () => {
        it('should not show dark blue box behind white modals', async () => {
            // Import the modal component
            const { createModal } = await import('../assets/components/Modal.js');

            // Create a modal
            const modal = createModal({
                title: 'Test Modal',
                content: 'Test content',
                size: 'medium'
            });

            // Check that the overlay has proper transparency
            // The modal returned is the overlay itself
            const overlay = modal;
            expect(overlay).toBeTruthy();
            expect(overlay.className).toBe('modal-overlay');

            // The modal content should be properly sized and positioned
            const modalContent = modal.querySelector('.modal-content');
            expect(modalContent).toBeTruthy();
            expect(modalContent.style.maxWidth).toBe('500px'); // medium size

            modal.remove();
        });

        it('should have modal content sit flush without visible background box', async () => {
            const { createModal } = await import('../assets/components/Modal.js');

            const modal = createModal({
                title: 'Test Modal',
                content: 'Test content',
                size: 'medium'
            });

            const overlay = modal.querySelector('.modal-overlay');
            const modalContent = modal.querySelector('.modal-content');

            // Modal content should be centered and not show any background box
            expect(modalContent.style.position).toBe('');

            modal.remove();
        });
    });

    describe('2. Modal Size Optimization', () => {
        it('should have share modal with appropriate compact size', async () => {
            const { createModal } = await import('../assets/components/Modal.js');

            const modal = createModal({
                title: 'Share',
                content: 'Share options',
                size: 'small'
            });

            const modalContent = modal.querySelector('.modal-content');
            expect(modalContent.style.maxWidth).toBe('400px'); // small size

            modal.remove();
        });

        it('should have templates modal with appropriate compact size', async () => {
            const { createModal } = await import('../assets/components/Modal.js');

            const modal = createModal({
                title: 'Templates',
                content: 'Template options',
                size: 'small'
            });

            const modalContent = modal.querySelector('.modal-content');
            expect(modalContent.style.maxWidth).toBe('400px'); // small size

            modal.remove();
        });

        it('should have analytics modal with appropriate compact size', async () => {
            const { createModal } = await import('../assets/components/Modal.js');

            const modal = createModal({
                title: 'Analytics',
                content: 'Analytics options',
                size: 'medium'
            });

            const modalContent = modal.querySelector('.modal-content');
            expect(modalContent.style.maxWidth).toBe('500px'); // medium size

            modal.remove();
        });
    });

    describe('3. Modal Dismiss Behavior', () => {
        it('should dismiss modal when clicking X button', async () => {
            const { createModal } = await import('../assets/components/Modal.js');

            const modal = createModal({
                title: 'Test Modal',
                content: 'Test content',
                size: 'medium'
            });

            // Click close button
            const closeBtn = modal.querySelector('.modal-close');
            closeBtn.click();

            // Modal should be removed
            expect(document.body.contains(modal)).toBe(false);
        });

        it('should dismiss modal when clicking outside content', async () => {
            const { createModal } = await import('../assets/components/Modal.js');

            const modal = createModal({
                title: 'Test Modal',
                content: 'Test content',
                size: 'medium'
            });

            // Click on overlay (outside content)
            const overlay = modal;
            overlay.click();

            // Modal should be removed
            expect(document.body.contains(modal)).toBe(false);
        });

        it('should dismiss modal when pressing ESC key', async () => {
            const { createModal } = await import('../assets/components/Modal.js');

            const modal = createModal({
                title: 'Test Modal',
                content: 'Test content',
                size: 'medium'
            });

            // Simulate ESC key press
            const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escEvent);

            // Modal should be removed
            expect(document.body.contains(modal)).toBe(false);
        });
    });
});
