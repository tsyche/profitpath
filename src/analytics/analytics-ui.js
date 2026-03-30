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

    // Analytics disabled state buttons
    const enableBtn = document.getElementById('enableAnalyticsBtn');
    if (enableBtn) {
      enableBtn.addEventListener('click', () => this.enableAnalytics());
    }

    const closeBtn = document.getElementById('closeAnalyticsBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
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
    console.log('[DEBUG analytics-ui] showAnalyticsDashboard called');
    const summary = this.analytics.getAnalyticsSummary();
    const events = this.analytics.getAllEvents();
    console.log('[DEBUG analytics-ui] summary:', summary);
    console.log('[DEBUG analytics-ui] events length:', events.length);

    // Create modal with proper structure
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = 'analyticsModal';

    const modal = document.createElement('div');
    modal.className = 'modal-content';
    modal.innerHTML = `
      <div class="modal-header" style="background-color: white !important; border-bottom: 1px solid #e5e7eb !important;">
        <h3 style="color: #000000 !important; font-weight: 600 !important; margin: 0 !important; font-size: 18px !important;">Analytics Dashboard</h3>
        <button class="btn-close" style="color: #000000 !important; background: none !important; border: none !important; font-size: 24px !important; cursor: pointer !important; padding: 0 !important;">&times;</button>
      </div>
      <div class="modal-body" style="color: #000000 !important;">
        ${this.renderDashboard(summary, events)}
      </div>
    `;

    modalOverlay.appendChild(modal);
    console.log('[DEBUG analytics-ui] modal created:', modalOverlay);
    document.body.appendChild(modalOverlay);
    console.log('[DEBUG analytics-ui] modal appended to body');

    // Show the modal
    modalOverlay.classList.remove('hidden');

    // Close handlers
    const closeBtn = modal.querySelector('.btn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modalOverlay.classList.add('hidden');
        setTimeout(() => {
          document.body.removeChild(modalOverlay);
        }, 300);
      });
    }

    // Analytics button handlers
    const enableBtn = modal.querySelector('#enableAnalyticsBtn');
    if (enableBtn) {
      enableBtn.addEventListener('click', () => {
        this.analytics.saveSettings({ enabled: true, trackUsage: true, trackFeatures: true, trackExports: true, trackTemplates: true });
        // Refresh the modal to show enabled state
        modalOverlay.remove();
        this.showAnalyticsDashboard();
      });
    }

    const closeAnalyticsBtn = modal.querySelector('#closeAnalyticsBtn');
    if (closeAnalyticsBtn) {
      closeAnalyticsBtn.addEventListener('click', () => {
        modalOverlay.classList.add('hidden');
        setTimeout(() => {
          document.body.removeChild(modalOverlay);
        }, 300);
      });
    }

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.add('hidden');
        setTimeout(() => {
          document.body.removeChild(modalOverlay);
        }, 300);
      }
    });

    // ESC key handler
    const escHandler = (e) => {
      if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
        modalOverlay.classList.add('hidden');
        setTimeout(() => {
          document.body.removeChild(modalOverlay);
        }, 300);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Analytics enabled state button handlers
    const exportBtn = modal.querySelector('#exportAnalyticsBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportAnalytics();
      });
    }

    const clearBtn = modal.querySelector('#clearAnalyticsBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearAnalytics();
        // Refresh the modal to show updated state
        modalOverlay.remove();
        this.showAnalyticsDashboard();
      });
    }

    const advancedBtn = modal.querySelector('#advancedDashboardBtn');
    if (advancedBtn) {
      advancedBtn.addEventListener('click', () => {
        this.showAdvancedDashboard();
      });
    }
  }

  renderDashboard(summary, events) {
    const hasData = events.length > 0;
    const isEnabled = this.analytics.settings.enabled;

    if (!isEnabled) {
      return `
        <div class="analytics-empty">
          <div style="text-align: center; padding: 40px 20px;">
            <h3 style="color: #374151; margin-bottom: 20px;">📊 Analytics is Disabled</h3>
            <p style="color: #6b7280; margin-bottom: 30px; line-height: 1.5;">
              Enable analytics to track your usage patterns and gain insights into your business performance.
            </p>
            <div style="margin-bottom: 20px;">
              <button id="enableAnalyticsBtn" class="btn btn-primary" style="margin-right: 10px; color: black !important; background-color: white !important; border: 1px solid black !important;">
                📊 Enable Analytics
              </button>
              <button id="closeAnalyticsBtn" class="btn btn-secondary" style="color: black !important; background-color: white !important; border: 1px solid black !important;">
                ❌ Close
              </button>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="analytics-dashboard">
        <div class="analytics-actions">
          <button id="exportAnalyticsBtn" class="btn btn-secondary" style="color: black !important; background-color: white !important; border: 1px solid black !important;">Export Data</button>
          <button id="clearAnalyticsBtn" class="btn btn-danger" style="color: black !important; background-color: white !important; border: 1px solid black !important;">Clear Data</button>
          <button id="advancedDashboardBtn" class="btn btn-primary" style="color: black !important; background-color: white !important; border: 1px solid black !important;">Advanced Dashboard</button>
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
      a.click();
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      this.showNotification('Failed to export analytics data', 'error');
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
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
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
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });

    // ESC key handler
    const escHandler = (e) => {
      if (e.key === 'Escape' && document.body.contains(modal)) {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    return modal;
  }

  showNotification(message, type = 'success') {
    // Simple notification implementation
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Use explicit colors instead of CSS variables
    const bgColor = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff';

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  enableAnalytics() {
    // Enable analytics and refresh dashboard
    if (this.analytics && this.analytics.saveSettings) {
      this.analytics.saveSettings({ enabled: true });

      // Show success notification
      this.showNotification('📊 Analytics enabled! Start using ProfitPath to see your data.', 'success');

      // Close current modal and reopen dashboard
      const currentModal = document.querySelector('.analytics-modal');
      if (currentModal) {
        document.body.removeChild(currentModal);
      }

      // Reopen dashboard to show updated state
      setTimeout(() => {
        this.showAnalyticsDashboard();
      }, 100);
    } else {
      this.showNotification('Analytics not available', 'error');
    }
  }

  clearAnalyticsData() {
    try {
      this.analytics.clearAllData();
      this.showNotification('Analytics data cleared successfully');
      this.analytics.trackFeatureUsage('analytics_cleared');

      // Refresh dashboard if it's open
      const currentModal = document.querySelector('.analytics-modal');
      if (currentModal) {
        document.body.removeChild(currentModal);
        setTimeout(() => {
          this.showAnalyticsDashboard();
        }, 100);
      }
    } catch (error) {
      console.error('Failed to clear analytics data:', error);
      this.showNotification('Failed to clear analytics data', 'error');
    }
  }

  exportAnalytics() {
    try {
      const exportData = this.analytics.exportData();
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `profitpath-analytics-${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      this.showNotification('Analytics data exported successfully');
      this.analytics.trackFeatureUsage('analytics_exported');
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      this.showNotification('Failed to export analytics data', 'error');
    }
  }

  clearAnalytics() {
    // Show confirmation modal first
    this.showClearAnalyticsConfirmation();
  }

  showClearAnalyticsConfirmation() {
    // Create confirmation modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'clearAnalyticsConfirmModal';
    modal.style.cssText = 'z-index: 10000; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center;';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px; z-index: 10001; position: relative;">
        <div class="modal-header" style="background-color: white !important; border-bottom: 1px solid #e5e7eb !important;">
          <h3 style="color: #000000 !important; font-weight: 600 !important;">Clear Analytics Data</h3>
          <button class="btn-close" style="color: #000000 !important;">&times;</button>
        </div>
        <div class="modal-body" style="color: #000000 !important; padding: 20px;">
          <p style="margin-bottom: 20px;">Are you sure you want to clear all analytics data? This action cannot be undone.</p>
          <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 12px; margin-bottom: 20px;">
            <strong style="color: #92400e;">⚠️ Warning:</strong>
            <p style="color: #92400e; margin: 8px 0 0 0;">This will permanently delete all usage tracking data, session history, and feedback records.</p>
          </div>
          <div class="modal-actions" style="display: flex; gap: 10px; justify-content: flex-end;">
            <button class="btn btn-secondary" id="cancelClearBtn" style="color: black !important; background-color: white !important; border: 1px solid black !important;">Cancel</button>
            <button class="btn btn-danger" id="confirmClearBtn" style="color: white !important; background-color: #dc2634 !important; border: 1px solid #dc2634 !important;">Clear All Data</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    const closeBtn = modal.querySelector('.btn-close');
    const cancelBtn = modal.querySelector('#cancelClearBtn');
    const confirmBtn = modal.querySelector('#confirmClearBtn');

    const closeModal = () => modal.remove();

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    confirmBtn.addEventListener('click', () => {
      this.clearAnalyticsData();
      modal.remove();

      // Refresh the dashboard
      const analyticsModal = document.getElementById('analyticsModal');
      if (analyticsModal) {
        analyticsModal.remove();
        this.showAnalyticsDashboard();
      }

      this.showNotification('Analytics data cleared successfully', 'success');
    });
  }

  showAdvancedDashboard() {
    // Close current modal
    const currentModal = document.getElementById('analyticsModal');
    if (currentModal) {
      currentModal.remove();
    }

    // Create advanced dashboard modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'advancedDashboardModal';

    const summary = this.analytics.getSummaryStats ? this.analytics.getSummaryStats() : {};
    const events = this.analytics.getAllEvents ? this.analytics.getAllEvents() : [];

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 900px;">
        <div class="modal-header" style="background-color: white !important; border-bottom: 1px solid #e5e7eb !important;">
          <h3 style="color: #000000 !important; font-weight: 600 !important;">Advanced Analytics Dashboard</h3>
          <button class="btn-close" style="color: #000000 !important;">&times;</button>
        </div>
        <div class="modal-body" style="color: #000000 !important; padding: 20px; max-height: 70vh; overflow-y: auto;">
          <div class="analytics-section" style="margin-bottom: 30px;">
            <h4 style="color: #000000 !important; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">📊 Detailed Statistics</h4>
            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
              <div class="stat-card" style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
                <div style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">Total Events</div>
                <div style="color: #000; font-size: 24px; font-weight: bold;">${summary.totalEvents || 0}</div>
              </div>
              <div class="stat-card" style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
                <div style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">Total Sessions</div>
                <div style="color: #000; font-size: 24px; font-weight: bold;">${summary.totalSessions || 0}</div>
              </div>
              <div class="stat-card" style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
                <div style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">Avg Events/Session</div>
                <div style="color: #000; font-size: 24px; font-weight: bold;">${summary.totalSessions ? Math.round(summary.totalEvents / summary.totalSessions) : 0}</div>
              </div>
              <div class="stat-card" style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
                <div style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">Data Range</div>
                <div style="color: #000; font-size: 14px; font-weight: bold;">${summary.dateRange?.start ? new Date(summary.dateRange.start).toLocaleDateString() : 'No data'} - ${summary.dateRange?.end ? new Date(summary.dateRange.end).toLocaleDateString() : ''}</div>
              </div>
            </div>
          </div>
          
          <div class="analytics-section" style="margin-bottom: 30px;">
            <h4 style="color: #000000 !important; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">🎯 Feature Usage</h4>
            <div class="feature-list" style="background: #f9fafb; padding: 15px; border-radius: 8px;">
              ${this.renderFeatureUsage(events)}
            </div>
          </div>
          
          <div class="analytics-section">
            <h4 style="color: #000000 !important; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">📈 Recent Activity</h4>
            <div class="activity-list" style="background: #f9fafb; padding: 15px; border-radius: 8px; max-height: 300px; overflow-y: auto;">
              ${this.renderRecentActivity(events)}
            </div>
          </div>
        </div>
        <div class="modal-footer" style="padding: 15px; border-top: 1px solid #e5e7eb; text-align: right;">
          <button class="btn btn-secondary" id="backToBasicBtn" style="color: black !important; background-color: white !important; border: 1px solid black !important;">Back to Basic View</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    const closeBtn = modal.querySelector('.btn-close');
    const backBtn = modal.querySelector('#backToBasicBtn');

    const closeAdvanced = () => {
      modal.remove();
      this.showAnalyticsDashboard();
    };

    closeBtn.addEventListener('click', closeAdvanced);
    backBtn.addEventListener('click', closeAdvanced);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAdvanced();
    });

    this.analytics.trackFeatureUsage('advanced_dashboard_opened');
  }

  renderFeatureUsage(events) {
    const featureCounts = {};
    events.forEach(event => {
      if (event.type === 'feature_used') {
        featureCounts[event.feature] = (featureCounts[event.feature] || 0) + 1;
      }
    });

    const sorted = Object.entries(featureCounts).sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
      return '<p style="color: #6b7280; text-align: center;">No feature usage data yet</p>';
    }

    return sorted.map(([feature, count]) => `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
        <span style="color: #374151;">${feature}</span>
        <span style="color: #000; font-weight: bold;">${count}</span>
      </div>
    `).join('');
  }

  renderRecentActivity(events) {
    const recent = events.slice(-20).reverse();

    if (recent.length === 0) {
      return '<p style="color: #6b7280; text-align: center;">No recent activity</p>';
    }

    return recent.map(event => `
      <div style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px;">
        <div style="color: #374151;">${event.type || event.action || 'Action'}</div>
        <div style="color: #6b7280; font-size: 11px;">${new Date(event.timestamp).toLocaleString()}</div>
      </div>
    `).join('');
  }
}

// Initialize analytics UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[DEBUG analytics-ui] DOMContentLoaded, checking window.profitPathAnalytics:', window.profitPathAnalytics);

  // Wait a bit for analytics to initialize
  setTimeout(() => {
    if (window.profitPathAnalytics) {
      console.log('[DEBUG analytics-ui] Initializing AnalyticsUI');
      window.profitPathAnalyticsUI = new AnalyticsUI();
      console.log('[DEBUG analytics-ui] window.profitPathAnalyticsUI set:', window.profitPathAnalyticsUI);
    } else {
      console.error('[DEBUG analytics-ui] window.profitPathAnalytics not found, cannot initialize UI');
    }
  }, 100);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalyticsUI;
}
