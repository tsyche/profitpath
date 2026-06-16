/**
 * Analytics and Usage Tracking Module
 * Privacy-first local analytics for ProfitPath
 */

class AnalyticsCollector {
  constructor() {
    this.settings = this.loadSettings();
    this.sessionStart = Date.now();
    this.events = [];
    this.sessionId = this.generateSessionId();

    // Initialize analytics if enabled
    if (this.settings.enabled) {
      this.initializeSession();
    }
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  loadSettings() {
    const defaultSettings = {
      enabled: false,
      trackUsage: false,
      trackFeatures: false,
      trackExports: false,
      trackTemplates: false,
      retentionDays: 90
    };

    const saved = localStorage.getItem('profitpath_analytics_settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  }

  saveSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem('profitpath_analytics_settings', JSON.stringify(this.settings));
  }

  initializeSession() {
    this.trackEvent('session_start', {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`
    });
  }

  trackEvent(eventName, data = {}) {
    if (!this.settings.enabled) return;

    const event = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      event: eventName,
      data: this.sanitizeData(data)
    };

    this.events.push(event);
    this.saveEvent(event);
  }

  generateEventId() {
    return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  sanitizeData(data) {
    // Remove any sensitive information
    const sanitized = { ...data };

    // Remove any fields that might contain personal data
    const sensitiveFields = ['email', 'name', 'phone', 'address', 'ssn', 'credit'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) delete sanitized[field];
    });

    return sanitized;
  }

  saveEvent(event) {
    try {
      const existingEvents = JSON.parse(localStorage.getItem('profitpath_analytics_events') || '[]');
      existingEvents.push(event);

      // Clean old events based on retention policy
      const cutoffDate = Date.now() - (this.settings.retentionDays * 24 * 60 * 60 * 1000);
      const filteredEvents = existingEvents.filter(e => e.timestamp > cutoffDate);

      localStorage.setItem('profitpath_analytics_events', JSON.stringify(filteredEvents));
    } catch (error) {
      console.warn('Failed to save analytics event:', error);
    }
  }

  // Specific tracking methods
  trackFeatureUsage(feature, details = {}) {
    if (!this.settings.trackFeatures) return;

    this.trackEvent('feature_usage', {
      feature,
      ...details
    });
  }

  trackScenarioAction(action, scenarioData = {}) {
    if (!this.settings.trackUsage) return;

    this.trackEvent('scenario_action', {
      action, // 'create', 'edit', 'delete', 'duplicate'
      scenarioCount: this.getScenarioCount(),
      ...scenarioData
    });
  }

  trackExport(format, scenarioCount = 1, additionalData = {}) {
    if (!this.settings.trackExports) return;

    this.trackEvent('export', {
      format, // 'pdf', 'excel', 'html'
      scenarioCount,
      ...additionalData
    });
  }

  trackTemplateUsage(templateId, templateName) {
    if (!this.settings.trackTemplates) return;

    this.trackEvent('template_usage', {
      templateId,
      templateName
    });
  }

  trackSettingsChange(setting, oldValue, newValue) {
    this.trackEvent('settings_change', {
      setting,
      oldValue,
      newValue
    });
  }

  trackFeedback(rating, category, comment = '') {
    this.trackEvent('feedback', {
      rating,
      category, // 'bug', 'feature', 'general', 'ux'
      comment: comment.substring(0, 500) // Limit comment length
    });
  }

  // Data retrieval methods
  getAllEvents() {
    try {
      return JSON.parse(localStorage.getItem('profitpath_analytics_events') || '[]');
    } catch {
      return [];
    }
  }

  getEventsByType(eventType) {
    return this.getAllEvents().filter(event => event.event === eventType);
  }

  getAnalyticsSummary() {
    const events = this.getAllEvents();
    const sessions = new Set(events.map(e => e.sessionId)).size;

    return {
      totalEvents: events.length,
      totalSessions: sessions,
      dateRange: {
        start: events.length > 0 ? new Date(Math.min(...events.map(e => e.timestamp))) : null,
        end: events.length > 0 ? new Date(Math.max(...events.map(e => e.timestamp))) : null
      },
      featureUsage: this.getFeatureUsageStats(events),
      exportStats: this.getExportStats(events),
      scenarioStats: this.getScenarioStats(events),
      templateStats: this.getTemplateStats(events)
    };
  }

  getFeatureUsageStats(events) {
    const featureEvents = events.filter(e => e.event === 'feature_usage');
    const stats = {};

    featureEvents.forEach(event => {
      const feature = event.data.feature;
      stats[feature] = (stats[feature] || 0) + 1;
    });

    return stats;
  }

  getExportStats(events) {
    const exportEvents = events.filter(e => e.event === 'export');
    const stats = { total: 0, byFormat: {} };

    exportEvents.forEach(event => {
      stats.total++;
      const format = event.data.format;
      stats.byFormat[format] = (stats.byFormat[format] || 0) + 1;
    });

    return stats;
  }

  getScenarioStats(events) {
    const scenarioEvents = events.filter(e => e.event === 'scenario_action');
    const stats = { total: 0, byAction: {} };

    scenarioEvents.forEach(event => {
      stats.total++;
      const action = event.data.action;
      stats.byAction[action] = (stats.byAction[action] || 0) + 1;
    });

    return stats;
  }

  getTemplateStats(events) {
    const templateEvents = events.filter(e => e.event === 'template_usage');
    const stats = {};

    templateEvents.forEach(event => {
      const templateName = event.data.templateName || 'Unknown';
      stats[templateName] = (stats[templateName] || 0) + 1;
    });

    return stats;
  }

  getScenarioCount() {
    try {
      const scenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
      return scenarios.length;
    } catch {
      return 0;
    }
  }

  sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>]/g, '').trim();
  }

  trackFeedback(rating, category, comment = null) {
    if (!this.settings.enabled || !this.settings.trackFeatures) return;

    this.trackEvent('feedback', {
      rating: parseInt(rating),
      category: this.sanitizeString(category),
      comment: comment ? this.sanitizeString(comment.substring(0, 500)) : null,
      timestamp: new Date().toISOString()
    });
  }

  // Data management
  exportData() {
    const data = {
      settings: this.settings,
      summary: this.getAnalyticsSummary(),
      events: this.getAllEvents(),
      exportDate: new Date().toISOString()
    };

    return data;
  }

  clearAllData() {
    localStorage.removeItem('profitpath_analytics_events');
    localStorage.removeItem('profitpath_analytics_settings');
    this.settings = this.loadSettings();
    this.events = [];
  }

  endSession() {
    if (!this.settings.enabled) return;

    const sessionDuration = Date.now() - this.sessionStart;
    this.trackEvent('session_end', {
      sessionId: this.sessionId,
      duration: sessionDuration,
      eventCount: this.events.length
    });
  }
}

// Initialize global analytics instance (skip in test mode)
if (typeof window !== 'undefined' && !window.__TEST_MODE__) {
  if (!window.profitPathAnalytics) {
    Object.defineProperty(window, 'profitPathAnalytics', {
      value: new AnalyticsCollector(),
      writable: true,
      configurable: true
    });
  }

  // Auto-end session on page unload
  window.addEventListener('beforeunload', () => {
    window.profitPathAnalytics.endSession();
  });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalyticsCollector;
}
