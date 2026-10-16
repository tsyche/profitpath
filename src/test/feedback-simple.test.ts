import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setTestMode, clearGlobalState, resetLocalStorage, clearVitestState, ensureElementRemove } from './test-utils.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

// Mock window.localStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  configurable: true,
  writable: true
});

describe('FeedbackCollector', () => {
  let FeedbackCollector;
  let feedbackCollector;

  beforeEach(async () => {
    // Set up test environment
    setTestMode();
    clearGlobalState();
    clearVitestState();
    ensureElementRemove();

    // Reset localStorage completely
    localStorageMock.clear();

    // Import the module fresh
    const module = await import('../../src/analytics/feedback.js');
    FeedbackCollector = module.FeedbackCollector;

    // Create new instance
    feedbackCollector = new FeedbackCollector();

    // Ensure clean state
    feedbackCollector.clearAllFeedback();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Initialization', () => {
    it('should initialize with storage key', () => {
      expect(feedbackCollector.storageKey).toBe('profitpath_feedback');
      expect(feedbackCollector.maxFeedbackItems).toBe(1000);
    });

  });

  describe('Feedback Submission', () => {
    it('should submit valid feedback', () => {
      const feedbackData = {
        rating: 5,
        category: 'feature',
        comment: 'Great feature!'
      };

      const feedback = feedbackCollector.submitFeedback(feedbackData);

      expect(feedback.id).toMatch(/^feedback_\d+_[a-z0-9]+$/);
      expect(feedback.rating).toBe(5);
      expect(feedback.category).toBe('feature');
      expect(feedback.comment).toBe('Great feature!');
      expect(feedback.timestamp).toBeDefined();
      expect(feedback.sessionId).toBeDefined();
    });

    it('should require rating and category', () => {
      // Test missing category
      expect(() => {
        feedbackCollector.submitFeedback({ rating: 5 });
      }).toThrow('Rating and category are required');

      // Test missing rating
      expect(() => {
        feedbackCollector.submitFeedback({ category: 'feature' });
      }).toThrow('Rating and category are required');

      // Test both missing
      expect(() => {
        feedbackCollector.submitFeedback({});
      }).toThrow('Rating and category are required');
    });

    it('should sanitize feedback data', () => {
      const feedbackData = {
        rating: 5,
        category: 'feature',
        comment: '<script>alert("xss")</script>Great feature!',
        email: 'user@example.com',
        name: 'John Doe'
      };

      const feedback = feedbackCollector.submitFeedback(feedbackData);

      expect(feedback.comment).not.toContain('<script>');
      // Check that sensitive fields are removed from the returned object
      expect(feedback.email).toBeUndefined();
      expect(feedback.name).toBeUndefined();
    });

    it('should limit comment length', () => {
      const longComment = 'a'.repeat(1500);
      const feedbackData = {
        rating: 5,
        category: 'feature',
        comment: longComment
      };

      const feedback = feedbackCollector.submitFeedback(feedbackData);
      expect(feedback.comment).toHaveLength(1000);
    });

    it('should validate rating range', () => {
      const feedbackData = {
        rating: 10, // Invalid rating
        category: 'feature'
      };

      const feedback = feedbackCollector.submitFeedback(feedbackData);
      expect(feedback.rating).toBe(5); // Should be clamped to max
    });

    it('should validate category', () => {
      const feedbackData = {
        rating: 5,
        category: 'invalid-category'
      };

      const feedback = feedbackCollector.submitFeedback(feedbackData);
      expect(feedback.category).toBe('other'); // Should default to 'other'
    });
  });

  describe('Feedback Retrieval', () => {
    beforeEach(() => {
      // Add some test feedback
      feedbackCollector.submitFeedback({ rating: 5, category: 'feature' });
      feedbackCollector.submitFeedback({ rating: 3, category: 'bug' });
      feedbackCollector.submitFeedback({ rating: 4, category: 'feature' });
    });

    it('should get all feedback', () => {
      const allFeedback = feedbackCollector.getAllFeedback();
      expect(allFeedback).toHaveLength(3);
    });

    it('should filter by category', () => {
      const featureFeedback = feedbackCollector.getAllFeedback({ category: 'feature' });
      expect(featureFeedback).toHaveLength(2);

      const bugFeedback = feedbackCollector.getAllFeedback({ category: 'bug' });
      expect(bugFeedback).toHaveLength(1);
    });

    it('should filter by rating', () => {
      const highRating = feedbackCollector.getAllFeedback({ rating: 5 });
      expect(highRating).toHaveLength(1);
    });

    it('should filter by date range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const recentFeedback = feedbackCollector.getAllFeedback({
        startDate: yesterday.toISOString(),
        endDate: tomorrow.toISOString()
      });

      expect(recentFeedback).toHaveLength(3);
    });
  });

  describe('Analytics', () => {
    beforeEach(() => {
      // Add test feedback with different ratings and categories
      feedbackCollector.submitFeedback({ rating: 5, category: 'feature' });
      feedbackCollector.submitFeedback({ rating: 4, category: 'feature' });
      feedbackCollector.submitFeedback({ rating: 3, category: 'bug' });
      feedbackCollector.submitFeedback({ rating: 2, category: 'usability' });
      feedbackCollector.submitFeedback({ rating: 5, category: 'feature' });
    });

    it('should generate analytics summary', () => {
      const analytics = feedbackCollector.getFeedbackAnalytics();

      expect(analytics.total).toBe(5);
      expect(analytics.averageRating).toBe(3.8); // (5+4+3+2+5)/5
      expect(analytics.ratingDistribution).toEqual({
        1: 0, 2: 1, 3: 1, 4: 1, 5: 2
      });
      expect(analytics.categoryBreakdown).toEqual({
        feature: 3, bug: 1, usability: 1
      });
    });

    it('should handle empty analytics', () => {
      // Clear all feedback
      feedbackCollector.clearAllFeedback();

      const analytics = feedbackCollector.getFeedbackAnalytics();

      expect(analytics.total).toBe(0);
      expect(analytics.averageRating).toBe(0);
      expect(analytics.ratingDistribution).toEqual({});
      expect(analytics.categoryBreakdown).toEqual({});
    });

    it('should calculate recent trend', () => {
      const analytics = feedbackCollector.getFeedbackAnalytics();

      expect(analytics.recentTrend).toHaveLength(7);
      expect(analytics.recentTrend[0]).toHaveProperty('date');
      expect(analytics.recentTrend[0]).toHaveProperty('count');
      expect(analytics.recentTrend[0]).toHaveProperty('averageRating');
    });

    it('should identify top issues', () => {
      // Add low rating feedback with comments
      feedbackCollector.submitFeedback({
        rating: 1,
        category: 'bug',
        comment: 'App crashes when exporting'
      });

      const analytics = feedbackCollector.getFeedbackAnalytics();
      expect(analytics.topIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Data Management', () => {
    it('should export feedback data', () => {
      feedbackCollector.submitFeedback({ rating: 5, category: 'feature', comment: 'Test' });

      const exported = feedbackCollector.exportFeedbackData();

      expect(exported.exportDate).toBeDefined();
      expect(exported.totalItems).toBe(1);
      expect(exported.analytics).toBeDefined();
      expect(exported.feedback).toHaveLength(1);
      expect(exported.feedback[0].comment).toBe('Test');
    });

    it('should clear all feedback', () => {
      feedbackCollector.submitFeedback({ rating: 5, category: 'feature' });
      expect(feedbackCollector.getAllFeedback()).toHaveLength(1);

      feedbackCollector.clearAllFeedback();
      expect(feedbackCollector.getAllFeedback()).toHaveLength(0);
    });

    it('should maintain storage limits', () => {
      // Mock max items to be smaller for testing
      feedbackCollector.maxFeedbackItems = 3;

      // Add more items than the limit
      for (let i = 0; i < 5; i++) {
        feedbackCollector.submitFeedback({ rating: 5, category: 'feature' });
      }

      const allFeedback = feedbackCollector.getAllFeedback();
      expect(allFeedback.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Suggestions', () => {
    it('should provide suggestions for low ratings', () => {
      // Add low rating feedback
      for (let i = 0; i < 5; i++) {
        feedbackCollector.submitFeedback({ rating: 2, category: 'bug' });
      }

      const suggestions = feedbackCollector.getFeedbackSuggestions();

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBe('warning');
      expect(suggestions[0].priority).toBe('high');
    });

    it('should provide suggestions for high bug reports', () => {
      // Add many bug reports
      for (let i = 0; i < 4; i++) {
        feedbackCollector.submitFeedback({ rating: 3, category: 'bug' });
      }

      const suggestions = feedbackCollector.getFeedbackSuggestions();

      const bugSuggestion = suggestions.find(s => s.message.includes('bug reports'));
      expect(bugSuggestion).toBeDefined();
      expect(bugSuggestion.priority).toBe('high');
    });

    it('should provide suggestions for feature requests', () => {
      // Add feature requests
      for (let i = 0; i < 3; i++) {
        feedbackCollector.submitFeedback({ rating: 4, category: 'feature' });
      }

      const suggestions = feedbackCollector.getFeedbackSuggestions();

      const featureSuggestion = suggestions.find(s => s.message.includes('features'));
      expect(featureSuggestion).toBeDefined();
      expect(featureSuggestion.priority).toBe('medium');
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted localStorage gracefully', () => {
      localStorageMock.setItem('profitpath_feedback', 'invalid json');

      const feedback = feedbackCollector.getAllFeedback();
      expect(feedback).toEqual([]);
    });

    it('should handle invalid feedback data gracefully', () => {
      // Put invalid data in localStorage
      localStorageMock.setItem('profitpath_feedback', JSON.stringify([
        { invalid: 'data' },
        { rating: 'not-a-number', category: 'feature' }
      ]));

      const feedback = feedbackCollector.getAllFeedback();
      expect(Array.isArray(feedback)).toBe(true);
    });
  });
});
