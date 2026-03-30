/**
 * Feedback UI Components for ProfitPath
 * Manages feedback modals, forms, and user interactions
 */

// Import FeedbackCollector
import { FeedbackCollector } from './feedback.js';

class FeedbackUI {
  constructor() {
    this.feedbackCollector = new FeedbackCollector();
    this.isModalOpen = false;
    this.currentContext = null;
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Add feedback button to UI
    this.addFeedbackButton();

    // Add keyboard shortcut (Ctrl/Cmd + F for feedback)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !e.shiftKey) {
        e.preventDefault();
        this.openFeedbackModal();
      }
    });
  }

  /**
   * Add feedback button to the UI
   */
  addFeedbackButton() {
    // Check if button already exists
    if (document.getElementById('feedbackBtn')) return;

    const feedbackBtn = document.createElement('button');
    feedbackBtn.id = 'feedbackBtn';
    feedbackBtn.className = 'feedback-btn';
    feedbackBtn.innerHTML = '💬 Feedback';
    feedbackBtn.title = 'Share your feedback (Ctrl+F)';
    feedbackBtn.addEventListener('click', () => this.openFeedbackModal());

    // Add to header or appropriate location
    const header = document.querySelector('.header');
    if (header) {
      header.appendChild(feedbackBtn);
    }
  }

  /**
   * Open feedback modal with optional context
   */
  openFeedbackModal(context = {}) {
    // Remove any existing modal first (defensive cleanup)
    const existingModal = document.getElementById('feedbackModal');
    if (existingModal) {
      existingModal.remove();
    }

    this.currentContext = context;
    this.isModalOpen = true;

    const modal = this.createFeedbackModal();
    document.body.appendChild(modal);

    // Focus on first input
    setTimeout(() => {
      const firstInput = modal.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    }, 100);
  }

  /**
   * Close feedback modal
   */
  closeFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    if (modal) {
      modal.remove();
    }
    this.isModalOpen = false;
    this.currentContext = null;

    // Prevent memory leaks by removing any lingering event listeners
    // This ensures clean state if modal is reopened
  }

  /**
   * Create feedback modal DOM
   */
  createFeedbackModal() {
    const modal = document.createElement('div');
    modal.id = 'feedbackModal';
    modal.className = 'feedback-modal';
    modal.innerHTML = `
      <div class="feedback-overlay"></div>
      <div class="feedback-content">
        <div class="feedback-header">
          <h3>Share Your Feedback</h3>
          <button class="feedback-close">×</button>
        </div>
        
        <form id="feedbackForm">
          <div class="feedback-section">
            <label for="feedbackRating">Overall Rating *</label>
            <div class="rating-container">
              ${this.createRatingStars()}
              <input type="hidden" id="feedbackRating" name="rating" required>
            </div>
          </div>
          
          <div class="feedback-section">
            <label for="feedbackCategory">Category *</label>
            <select id="feedbackCategory" name="category" required>
              <option value="">Select a category</option>
              <option value="bug">🐛 Bug Report</option>
              <option value="feature">💡 Feature Request</option>
              <option value="improvement">🔧 Improvement</option>
              <option value="general">💭 General Feedback</option>
            </select>
          </div>
          
          <div class="feedback-section">
            <label for="feedbackComment">Comments *</label>
            <textarea id="feedbackComment" name="comment" placeholder="Please share your detailed feedback..." required maxlength="500"></textarea>
            <div class="char-count">
              <span id="commentCharCount">0</span> / 500
            </div>
          </div>
          
          <div class="feedback-actions">
            <button type="button" class="btn secondary cancel-feedback">Cancel</button>
            <button type="submit" class="btn primary">
              Submit Feedback
            </button>
          </div>
        </form>
      </div>
    `;

    // Add event listeners
    this.attachModalEventListeners(modal);

    return modal;
  }

  /**
   * Create rating stars component
   */
  createRatingStars() {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += `
        <button 
          type="button" 
          class="rating-star" 
          data-rating="${i}"
        >
          ⭐
        </button>
      `;
    }
    return stars;
  }

  /**
   * Create context section if context is provided
   */
  createContextSection() {
    return `
      <div class="feedback-section">
        <label>Context</label>
        <div class="context-info">
          ${this.currentContext.action ? `<p><strong>Action:</strong> ${this.currentContext.action}</p>` : ''}
          ${this.currentContext.feature ? `<p><strong>Feature:</strong> ${this.currentContext.feature}</p>` : ''}
          ${this.currentContext.scenario ? `<p><strong>Scenario:</strong> ${this.currentContext.scenario}</p>` : ''}
        </div>
        <input type="hidden" name="context" value='${JSON.stringify(this.currentContext)}'>
      </div>
    `;
  }

  /**
   * Attach event listeners to modal elements
   */
  attachModalEventListeners(modal) {
    // Overlay click to close
    const overlay = modal.querySelector('.feedback-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.closeFeedbackModal());
    }

    // Close button
    const closeBtn = modal.querySelector('.feedback-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeFeedbackModal());
    }

    // Cancel button
    const cancelBtn = modal.querySelector('.cancel-feedback');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeFeedbackModal());
    }

    // Rating stars
    const stars = modal.querySelectorAll('.rating-star');
    stars.forEach(star => {
      const rating = parseInt(star.dataset.rating);

      star.addEventListener('click', () => this.setRating(rating));
      star.addEventListener('mouseover', () => this.previewRating(rating));
      star.addEventListener('mouseout', () => this.clearRatingPreview());
    });

    // Character counter for comment
    const commentTextarea = modal.querySelector('#feedbackComment');
    const charCount = modal.querySelector('#commentCharCount');

    if (commentTextarea && charCount) {
      commentTextarea.addEventListener('input', () => {
        charCount.textContent = commentTextarea.value.length;
      });
    }

    // Form submission
    const form = modal.querySelector('#feedbackForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleFeedbackSubmit(e));
    }

    // Escape key to close
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeFeedbackModal();
      }
    });
  }

  /**
   * Set rating value
   */
  setRating(rating) {
    const ratingInput = document.getElementById('feedbackRating');
    const stars = document.querySelectorAll('.rating-star');

    ratingInput.value = rating;

    stars.forEach((star, index) => {
      if (index < rating) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
  }

  /**
   * Preview rating on hover
   */
  previewRating(rating) {
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
      if (index < rating) {
        star.classList.add('preview');
      } else {
        star.classList.remove('preview');
      }
    });
  }

  /**
   * Clear rating preview
   */
  clearRatingPreview() {
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach(star => star.classList.remove('preview'));
  }

  /**
   * Handle feedback form submission
   */
  async handleFeedbackSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const feedbackData = {
      rating: parseInt(formData.get('rating')),
      category: formData.get('category'),
      comment: formData.get('comment') || null,
      allowContact: formData.has('allowContact'),
      context: formData.get('context') ? JSON.parse(formData.get('context')) : null,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    try {
      // Submit feedback
      const feedback = this.feedbackCollector.submitFeedback(feedbackData);

      // Show success message with clear next steps
      let successMessage = 'Thank you for your feedback!';
      if (feedbackData.allowContact && feedbackData.comment) {
        successMessage += ' Your feedback has been saved and an email draft has been opened for you to send.';
      } else {
        successMessage += ' Your feedback has been saved locally.';
      }

      this.showNotification(successMessage, 'success');

      // Close modal
      this.closeFeedbackModal();

      // Track feedback submission
      if (window.profitPathAnalytics) {
        window.profitPathAnalytics.trackFeatureUsage('feedback_submitted', {
          rating: feedback.rating,
          category: feedback.category
        });
      }

    } catch (error) {
      console.error('Failed to submit feedback:', error);
      this.showNotification('Failed to submit feedback. Please try again.', 'error');
    }
  }

  /**
   * Show notification message
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `feedback-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * Show contextual feedback prompt
   */
  showContextualPrompt(context, delay = 2000) {
    setTimeout(() => {
      if (!this.isModalOpen) {
        const prompt = this.createContextualPrompt(context);
        document.body.appendChild(prompt);

        // Auto remove after 5 seconds
        setTimeout(() => {
          if (prompt.parentNode) {
            prompt.remove();
          }
        }, 5000);
      }
    }, delay);
  }

  /**
   * Create contextual prompt
   */
  createContextualPrompt(context) {
    const prompt = document.createElement('div');
    prompt.className = 'feedback-prompt';
    prompt.innerHTML = `
      <div class="prompt-content">
        <p>How was your experience with ${context.action || 'this feature'}?</p>
        <div class="prompt-actions">
          <button class="btn small" onclick="feedbackUI.openFeedbackModal(${JSON.stringify(context).replace(/"/g, '&quot;')})">
            Leave Feedback
          </button>
          <button class="btn small secondary" onclick="this.closest('.feedback-prompt').remove()">
            Dismiss
          </button>
        </div>
      </div>
    `;

    return prompt;
  }
}

// Initialize feedback UI when DOM is ready (skip in test mode)
if (typeof window !== 'undefined' && !window.__TEST_MODE__) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.feedbackUI = new FeedbackUI();
    });
  } else {
    window.feedbackUI = new FeedbackUI();
  }
}

// Export for use in other modules
export { FeedbackUI };
