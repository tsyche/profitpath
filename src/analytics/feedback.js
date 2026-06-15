/**
 * Feedback Collection System for ProfitPath
 * Handles user feedback submission, storage, and analysis
 */

// Remote feedback delivery via Web3Forms (https://web3forms.com). This is a
// static, server-less app, so feedback can't reach the maintainer on its own —
// Web3Forms accepts a client-side POST and emails each submission to you.
// To enable: create a free access key (just enter your email at web3forms.com)
// and paste it below. It's a public submit-only key, safe to ship in the bundle.
// Leave blank to keep the previous local-only + mailto behavior.
const WEB3FORMS_ACCESS_KEY = 'faddffa2-870d-4e8c-84a9-33224347365a';
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

class FeedbackCollector {
  constructor() {
    this.storageKey = 'profitpath_feedback';
    this.maxFeedbackItems = 1000;
    this.remoteEndpoint = WEB3FORMS_ENDPOINT;
    this.remoteAccessKey = WEB3FORMS_ACCESS_KEY;
    this.initializeStorage();
  }

  remoteEnabled() {
    return typeof this.remoteAccessKey === 'string' && this.remoteAccessKey.length > 0;
  }

  initializeStorage() {
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify([]));
    }
  }

  /**
   * Submit feedback with validation and sanitization
   */
  submitFeedback(feedbackData) {
    // Validate required fields before sanitization
    if (!feedbackData.rating || !feedbackData.category) {
      throw new Error('Rating and category are required');
    }

    // Pull email out before sanitizing — we send it to the remote but never
    // store it locally to avoid keeping PII in localStorage.
    const contactEmail = feedbackData.contactEmail || null;

    const feedback = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      synced: false, // flips true once delivered to the remote endpoint
      ...this.sanitizeFeedback(feedbackData)
    };

    // Validate required fields after sanitization
    if (!feedback.rating || !feedback.category) {
      throw new Error('Rating and category are required');
    }

    // Store feedback (also acts as an offline buffer / retry queue)
    const allFeedback = this.getAllFeedback();
    allFeedback.push(feedback);

    // Maintain storage limits
    if (allFeedback.length > this.maxFeedbackItems) {
      allFeedback.splice(0, allFeedback.length - this.maxFeedbackItems);
    }

    localStorage.setItem(this.storageKey, JSON.stringify(allFeedback));

    // Deliver it. Prefer the remote endpoint when configured; otherwise fall
    // back to the opt-in mailto so behavior is unchanged until a key is added.
    if (this.remoteEnabled()) {
      this.sendToRemote(feedback, contactEmail);
    } else if (contactEmail && feedback.comment) {
      this.sendEmailNotification(feedback);
    }

    // Track feedback submission if analytics is enabled
    if (window.profitPathAnalytics) {
      window.profitPathAnalytics.trackFeedback(
        feedback.rating,
        feedback.category,
        feedback.comment
      );
    }

    return feedback;
  }

  /**
   * Send email notification for feedback
   */
  async sendEmailNotification(feedback) {
    try {
      // Create email content
      const emailContent = `
ProfitPath Feedback Received
============================

Rating: ${feedback.rating}/5 stars
Category: ${feedback.category}
Comment: ${feedback.comment}
Context: ${feedback.context ? JSON.stringify(feedback.context, null, 2) : 'None'}
Timestamp: ${new Date(feedback.timestamp).toLocaleString()}
User Agent: ${feedback.userAgent}
Page: ${feedback.url}

---
This feedback was submitted via the ProfitPath feedback form.
`;

      // Create mailto link
      const subject = encodeURIComponent('ProfitPath Feedback Received');
      const body = encodeURIComponent(emailContent);
      const mailtoLink = `mailto:gh@tsyche.anonaddy.com?subject=${subject}&body=${body}`;

      // Open email client
      window.open(mailtoLink, '_blank');

      console.log('Email client opened for feedback submission');

    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  /**
   * Deliver one feedback item to the remote endpoint (Web3Forms). On success the
   * stored copy is marked synced; on failure it stays queued for a later retry.
   */
  async sendToRemote(feedback, contactEmail = null) {
    if (!this.remoteEnabled()) return false;
    try {
      const payload = {
        access_key: this.remoteAccessKey,
        subject: `ProfitPath Feedback: ${feedback.rating}★ ${feedback.category}`,
        from_name: 'ProfitPath Feedback',
        rating: feedback.rating,
        category: feedback.category,
        comment: feedback.comment || '(none)',
        contact_email: contactEmail || '(not provided)',
        page: feedback.url || '',
        user_agent: feedback.userAgent || '',
        context: feedback.context ? JSON.stringify(feedback.context) : '',
        submitted_at: feedback.timestamp
      };
      const res = await fetch(this.remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        this.markSynced(feedback.id);
        return true;
      }
      console.warn('Remote feedback rejected:', data.message || res.status);
    } catch (error) {
      console.warn('Failed to send feedback to remote endpoint:', error);
    }
    return false;
  }

  /** Mark a stored feedback item as delivered. */
  markSynced(id) {
    const all = this.getAllFeedback();
    const item = all.find((f) => f.id === id);
    if (item) {
      item.synced = true;
      localStorage.setItem(this.storageKey, JSON.stringify(all));
    }
  }

  /** Retry delivery for any feedback saved while offline or before a key existed. */
  flushUnsyncedFeedback() {
    if (!this.remoteEnabled()) return;
    const unsent = this.getAllFeedback().filter((f) => f.synced === false);
    unsent.forEach((f) => this.sendToRemote(f));
  }

  /**
   * Get all feedback with optional filtering
   */
  getAllFeedback(filters = {}) {
    try {
      const feedback = JSON.parse(localStorage.getItem(this.storageKey) || '[]');

      return feedback.filter(item => {
        if (filters.category && item.category !== filters.category) return false;
        if (filters.rating !== undefined && item.rating !== filters.rating) return false;
        if (filters.startDate && new Date(item.timestamp) < new Date(filters.startDate)) return false;
        if (filters.endDate && new Date(item.timestamp) > new Date(filters.endDate)) return false;
        return true;
      });
    } catch (e) {
      console.error('Failed to load feedback:', e);
      return [];
    }
  }

  /**
   * Get feedback analytics and insights
   */
  getFeedbackAnalytics() {
    const feedback = this.getAllFeedback();

    if (feedback.length === 0) {
      return {
        total: 0,
        averageRating: 0,
        ratingDistribution: {},
        categoryBreakdown: {},
        recentTrend: [],
        topIssues: []
      };
    }

    const analytics = {
      total: feedback.length,
      averageRating: this.calculateAverageRating(feedback),
      ratingDistribution: this.getRatingDistribution(feedback),
      categoryBreakdown: this.getCategoryBreakdown(feedback),
      recentTrend: this.getRecentTrend(feedback),
      topIssues: this.getTopIssues(feedback)
    };

    return analytics;
  }

  /**
   * Export feedback data
   */
  exportFeedbackData() {
    const feedback = this.getAllFeedback();
    const analytics = this.getFeedbackAnalytics();

    return {
      exportDate: new Date().toISOString(),
      totalItems: feedback.length,
      analytics,
      feedback: feedback.map(item => ({
        ...item,
        // Sanitize for export
        comment: item.comment ? item.comment.substring(0, 500) : null
      }))
    };
  }

  /**
   * Clear all feedback data
   */
  clearAllFeedback() {
    localStorage.removeItem(this.storageKey);
    this.initializeStorage();
  }

  /**
   * Get feedback suggestions based on patterns
   */
  getFeedbackSuggestions() {
    const analytics = this.getFeedbackAnalytics();
    const suggestions = [];

    // Low overall rating
    if (analytics.averageRating < 3) {
      suggestions.push({
        type: 'warning',
        message: 'Overall satisfaction is low. Consider reviewing user feedback for common issues.',
        priority: 'high'
      });
    }

    // High bug reports
    if (analytics.categoryBreakdown.bug && analytics.categoryBreakdown.bug > analytics.total * 0.3) {
      suggestions.push({
        type: 'action',
        message: 'High number of bug reports reported. Focus on stability improvements.',
        priority: 'high'
      });
    }

    // Feature requests
    if (analytics.categoryBreakdown.feature && analytics.categoryBreakdown.feature > analytics.total * 0.2) {
      suggestions.push({
        type: 'opportunity',
        message: 'Users are actively requesting features. Consider prioritizing feature development.',
        priority: 'medium'
      });
    }

    return suggestions;
  }

  // Private helper methods
  sanitizeFeedback(feedback) {
    const sanitized = { ...feedback };

    // Remove PII — email is handled separately and never stored locally
    const sensitiveFields = ['email', 'contactEmail', 'name', 'phone', 'address', 'creditCard'];
    sensitiveFields.forEach(field => delete sanitized[field]);

    // Sanitize comment
    if (sanitized.comment) {
      sanitized.comment = sanitized.comment
        .substring(0, 1000) // Limit length
        .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove scripts
        .trim();
    }

    // Validate rating
    sanitized.rating = Math.max(1, Math.min(5, parseInt(sanitized.rating) || 0));

    // Validate category
    const validCategories = ['feature', 'bug', 'usability', 'performance', 'suggestion', 'other'];
    if (!validCategories.includes(sanitized.category)) {
      sanitized.category = 'other';
    }

    return sanitized;
  }

  generateId() {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessionId() {
    return window.profitPathAnalytics?.sessionId || 'unknown';
  }

  calculateAverageRating(feedback) {
    const sum = feedback.reduce((acc, item) => acc + item.rating, 0);
    return Math.round((sum / feedback.length) * 10) / 10;
  }

  getRatingDistribution(feedback) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedback.forEach(item => {
      distribution[item.rating] = (distribution[item.rating] || 0) + 1;
    });
    return distribution;
  }

  getCategoryBreakdown(feedback) {
    const breakdown = {};
    feedback.forEach(item => {
      breakdown[item.category] = (breakdown[item.category] || 0) + 1;
    });
    return breakdown;
  }

  getRecentTrend(feedback) {
    const last7Days = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayFeedback = feedback.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= date && itemDate < nextDate;
      });

      last7Days.push({
        date: date.toISOString().split('T')[0],
        count: dayFeedback.length,
        averageRating: dayFeedback.length > 0 ? this.calculateAverageRating(dayFeedback) : 0
      });
    }

    return last7Days;
  }

  getTopIssues(feedback) {
    const issues = feedback
      .filter(item => item.rating <= 2 && item.comment)
      .map(item => item.comment.substring(0, 100))
      .filter((comment, index, arr) => arr.indexOf(comment) === index) // Remove duplicates
      .slice(0, 5);

    return issues;
  }
}

// Export for use in other modules
export { FeedbackCollector };
