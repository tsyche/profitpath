/**
 * Analytics Settings and UI Management
 * Handles analytics settings panel and user interactions
 */

class AnalyticsUI {
  constructor() {
    this.analytics = window.profitPathAnalytics;
    this.initializeSettings();
    this.attachEventListeners();
  }

  initializeSettings() {
    // Load analytics settings into UI
    const settings = this.analytics.settings;

    // Main analytics toggle
    const enabledCheckbox = document.getElementById('analyticsEnabled');
    if (enabledCheckbox) {
      enabledCheckbox.checked = settings.enabled;
      this.toggleAnalyticsOptions(settings.enabled);
    }

    // Individual tracking options
    const trackingOptions = {
      'trackUsage': settings.trackUsage,
      'trackFeatures': settings.trackFeatures,
      'trackExports': settings.trackExports,
      'trackTemplates': settings.trackTemplates
    };

    Object.entries(trackingOptions).forEach(([id, value]) => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.checked = value;
      }
    });
  }

  attachEventListeners() {
    // Main analytics toggle
    const enabledCheckbox = document.getElementById('analyticsEnabled');
    if (enabledCheckbox) {
      enabledCheckbox.addEventListener('change', (e) => {
        this.handleAnalyticsToggle(e.target.checked);
      });
    }

    // Individual tracking options
    const trackingOptionIds = ['trackUsage', 'trackFeatures', 'trackExports', 'trackTemplates'];
    trackingOptionIds.forEach(id => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          this.handleTrackingOptionChange(id, e.target.checked);
        });
      }
    });

    // Analytics action buttons
    const viewBtn = document.getElementById('viewAnalyticsBtn');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => this.showAnalyticsDashboard());
    }

    const exportBtn = document.getElementById('exportAnalyticsBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportAnalyticsData());
    }

    const clearBtn = document.getElementById('clearAnalyticsBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearAnalyticsData());
    }

    const advancedBtn = document.getElementById('advancedDashboardBtn');
    if (advancedBtn) {
      advancedBtn.addEventListener('click', () => this.showAdvancedDashboard());
    }
  }

  handleAnalyticsToggle(enabled) {
    this.analytics.saveSettings({ enabled });

    // If enabling, start session tracking
    if (enabled && !this.analytics.sessionStart) {
      this.analytics.initializeSession();
    }

    this.toggleAnalyticsOptions(enabled);

    // Track the setting change
    this.analytics.trackSettingsChange('analyticsEnabled', !enabled, enabled);

    // Show notification
    this.showNotification(
      enabled ? 'Analytics enabled. Thank you for helping improve ProfitPath!' : 'Analytics disabled'
    );
  }

  handleTrackingOptionChange(option, enabled) {
    this.analytics.saveSettings({ [option]: enabled });
    this.analytics.trackSettingsChange(option, !enabled, enabled);
  }

  toggleAnalyticsOptions(show) {
    const options = document.getElementById('analyticsOptions');
    const actions = document.getElementById('analyticsActions');

    if (options) options.style.display = show ? 'block' : 'none';
    if (actions) actions.style.display = show ? 'block' : 'none';
  }

  showAnalyticsDashboard() {
    const summary = this.analytics.getAnalyticsSummary();
    const events = this.analytics.getAllEvents();

    const modal = this.createModal('Analytics Dashboard', this.renderDashboard(summary, events));
    document.body.appendChild(modal);
  }

  renderDashboard(summary, events) {
    const hasData = events.length > 0;

    if (!hasData) {
      return `
        <div class="analytics-empty">
          <p style="text-align: center; color: var(--muted); padding: 40px 20px;">
            No analytics data yet. Enable analytics and start using ProfitPath to see your usage patterns!
          </p>
        </div>
      `;
    }

    return `
      <div class="analytics-dashboard">
        <div class="analytics-actions">
          <button id="exportAnalyticsBtn" class="btn btn-secondary">Export Data</button>
          <button id="clearAnalyticsBtn" class="btn btn-danger">Clear Data</button>
          <button id="advancedDashboardBtn" class="btn btn-primary">Advanced Dashboard</button>
        </div>
        
        <div class="analytics-summary">
          <div class="stat-card">
            <h4>Total Events</h4>
            <div class="stat-value">${summary.totalEvents}</div>
          </div>
          <div class="stat-card">
            <h4>Sessions</h4>
            <div class="stat-value">${summary.totalSessions}</div>
          </div>
          <div class="stat-card">
            <h4>Data Range</h4>
            <div class="stat-value small">
              ${summary.dateRange.start ?
        `${new Date(summary.dateRange.start).toLocaleDateString()} - ${new Date(summary.dateRange.end).toLocaleDateString()}` :
        'No data'
      }
            </div>
          </div>
        </div>

        ${Object.keys(summary.featureUsage).length > 0 ? `
          <div class="analytics-section">
            <h4>Feature Usage</h4>
            <div class="usage-list">
              ${Object.entries(summary.featureUsage)
          .sort(([, a], [, b]) => b - a)
          .map(([feature, count]) => `
                  <div class="usage-item">
                    <span class="feature-name">${this.formatFeatureName(feature)}</span>
                    <span class="usage-count">${count}</span>
                  </div>
                `).join('')}
            </div>
          </div>
        ` : ''}

        ${summary.exportStats.total > 0 ? `
          <div class="analytics-section">
            <h4>Export Activity</h4>
            <div class="export-stats">
              <div class="stat-row">
                <span>Total Exports:</span>
                <span>${summary.exportStats.total}</span>
              </div>
              ${Object.entries(summary.exportStats.byFormat)
          .map(([format, count]) => `
                  <div class="stat-row">
                    <span>${format.toUpperCase()}:</span>
                    <span>${count}</span>
                  </div>
                `).join('')}
            </div>
          </div>
        ` : ''}

        ${Object.keys(summary.templateStats).length > 0 ? `
          <div class="analytics-section">
            <h4>Template Usage</h4>
            <div class="usage-list">
              ${Object.entries(summary.templateStats)
          .sort(([, a], [, b]) => b - a)
          .map(([template, count]) => `
                  <div class="usage-item">
                    <span class="feature-name">${template}</span>
                    <span class="usage-count">${count}</span>
                  </div>
                `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  formatFeatureName(feature) {
    // Convert camelCase to readable format
    return feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  exportAnalyticsData() {
    try {
      const data = this.analytics.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `profitpath-analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showNotification('Analytics data exported successfully');
      this.analytics.trackFeatureUsage('analytics_export');
    } catch (error) {
      this.showNotification('Failed to export analytics data', 'error');
      console.error('Export error:', error);
    }
  }

  clearAnalyticsData() {
    if (confirm('Are you sure you want to delete all analytics data? This cannot be undone.')) {
      try {
        this.analytics.clearAllData();
        this.initializeSettings(); // Refresh UI
        this.showNotification('All analytics data cleared');
        this.analytics.trackFeatureUsage('analytics_clear'); // This won't be saved since data is cleared
      } catch (error) {
        this.showNotification('Failed to clear analytics data', 'error');
        console.error('Clear error:', error);
      }
    }
  }

  showAdvancedDashboard() {
    try {
      // Import and create advanced dashboard
      import('./advanced-dashboard.js').then(module => {
        const AdvancedDashboard = module.AdvancedAnalyticsDashboard;
        const dashboard = new AdvancedDashboard();

        // Create and show the dashboard modal
        const dashboardElement = dashboard.createDashboard();
        const modal = this.createModal('Advanced Analytics Dashboard', dashboardElement.outerHTML);

        // Initialize the dashboard after it's added to DOM
        document.body.appendChild(modal);

        // Re-attach event listeners to the dashboard content
        const dashboardContent = modal.querySelector('.advanced-analytics-dashboard');
        if (dashboardContent) {
          dashboard.attachDashboardEventListeners(dashboardContent);
          dashboard.refreshDashboard();
        }

        this.showNotification('Advanced dashboard loaded');
        this.analytics.trackFeatureUsage('advanced_dashboard_open');
      }).catch(error => {
        this.showNotification('Failed to load advanced dashboard', 'error');
        console.error('Dashboard load error:', error);
      });
    } catch (error) {
      this.showNotification('Failed to open advanced dashboard', 'error');
      console.error('Dashboard error:', error);
    }
  }

  createModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay analytics-modal';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;

    // Close handlers
    modal.querySelector('.modal-close').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });

    return modal;
  }

  showNotification(message, type = 'success') {
    // Create a simple notification (could be enhanced with existing notification system)
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'error' ? 'var(--bad)' : 'var(--good)'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 10000;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(20px)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// Initialize analytics UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for analytics to initialize
  setTimeout(() => {
    if (window.profitPathAnalytics) {
      window.profitPathAnalyticsUI = new AnalyticsUI();
    }
  }, 100);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalyticsUI;
}
