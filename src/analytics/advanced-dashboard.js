/**
 * Advanced Analytics Dashboard for ProfitPath
 * Provides charts, visualizations, and comprehensive insights
 */

class AdvancedAnalyticsDashboard {
  constructor() {
    this.analyticsCollector = null;
    this.feedbackCollector = null;
    this.chartInstances = new Map();
    this.currentView = 'overview';
    this.dateRange = '30d'; // Default to 30 days
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Initialize when analytics modules are available
    if (window.profitPathAnalytics) {
      this.analyticsCollector = window.profitPathAnalytics;
    }
    
    if (window.FeedbackCollector) {
      this.feedbackCollector = new FeedbackCollector();
    }
  }

  /**
   * Create comprehensive dashboard with all analytics
   */
  createDashboard() {
    const dashboard = document.createElement('div');
    dashboard.className = 'advanced-analytics-dashboard';
    dashboard.innerHTML = `
      <div class="dashboard-header">
        <h2>Advanced Analytics Dashboard</h2>
        <div class="dashboard-controls">
          <select id="dateRangeSelect" class="date-range-select">
            <option value="7d">Last 7 Days</option>
            <option value="30d" selected>Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
            <option value="all">All Time</option>
          </select>
          <button id="exportDashboardBtn" class="btn btn-secondary">Export Report</button>
        </div>
      </div>

      <div class="dashboard-navigation">
        <button class="nav-btn active" data-view="overview">Overview</button>
        <button class="nav-btn" data-view="usage">Usage Patterns</button>
        <button class="nav-btn" data-view="feedback">Feedback Analysis</button>
        <button class="nav-btn" data-view="performance">Performance</button>
        <button class="nav-btn" data-view="insights">Insights</button>
      </div>

      <div class="dashboard-content">
        <div id="overviewView" class="dashboard-view active">
          ${this.createOverviewContent()}
        </div>
        <div id="usageView" class="dashboard-view">
          ${this.createUsageContent()}
        </div>
        <div id="feedbackView" class="dashboard-view">
          ${this.createFeedbackContent()}
        </div>
        <div id="performanceView" class="dashboard-view">
          ${this.createPerformanceContent()}
        </div>
        <div id="insightsView" class="dashboard-view">
          ${this.createInsightsContent()}
        </div>
      </div>
    `;

    this.attachDashboardEventListeners(dashboard);
    return dashboard;
  }

  createOverviewContent() {
    return `
      <div class="overview-grid">
        <div class="metric-cards">
          <div class="metric-card primary">
            <h3>Total Sessions</h3>
            <div class="metric-value" id="totalSessions">-</div>
            <div class="metric-change" id="sessionsChange">-</div>
          </div>
          <div class="metric-card success">
            <h3>Total Exports</h3>
            <div class="metric-value" id="totalExports">-</div>
            <div class="metric-change" id="exportsChange">-</div>
          </div>
          <div class="metric-card warning">
            <h3>Feedback Items</h3>
            <div class="metric-value" id="totalFeedback">-</div>
            <div class="metric-change" id="feedbackChange">-</div>
          </div>
          <div class="metric-card info">
            <h3>Avg. Rating</h3>
            <div class="metric-value" id="avgRating">-</div>
            <div class="metric-change" id="ratingChange">-</div>
          </div>
        </div>

        <div class="chart-container">
          <h3>Activity Timeline</h3>
          <canvas id="activityTimelineChart"></canvas>
        </div>

        <div class="chart-container">
          <h3>Export Distribution</h3>
          <canvas id="exportDistributionChart"></canvas>
        </div>

        <div class="insights-panel">
          <h3>Key Insights</h3>
          <div id="keyInsights" class="insights-list">
            <!-- Insights will be populated dynamically -->
          </div>
        </div>
      </div>
    `;
  }

  createUsageContent() {
    return `
      <div class="usage-grid">
        <div class="chart-container large">
          <h3>Daily Usage Patterns</h3>
          <canvas id="dailyUsageChart"></canvas>
        </div>

        <div class="chart-container">
          <h3>Feature Usage Heatmap</h3>
          <div id="featureHeatmap" class="heatmap-container">
            <!-- Heatmap will be generated dynamically -->
          </div>
        </div>

        <div class="usage-stats">
          <h3>Usage Statistics</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <label>Peak Usage Hour:</label>
              <span id="peakUsageHour">-</span>
            </div>
            <div class="stat-item">
              <label>Average Session Duration:</label>
              <span id="avgSessionDuration">-</span>
            </div>
            <div class="stat-item">
              <label>Most Used Feature:</label>
              <span id="mostUsedFeature">-</span>
            </div>
            <div class="stat-item">
              <label>Conversion Rate:</label>
              <span id="conversionRate">-</span>
            </div>
          </div>
        </div>

        <div class="chart-container">
          <h3>User Journey Funnel</h3>
          <canvas id="userJourneyChart"></canvas>
        </div>
      </div>
    `;
  }

  createFeedbackContent() {
    return `
      <div class="feedback-grid">
        <div class="chart-container">
          <h3>Rating Trends</h3>
          <canvas id="ratingTrendsChart"></canvas>
        </div>

        <div class="chart-container">
          <h3>Feedback Categories</h3>
          <canvas id="feedbackCategoriesChart"></canvas>
        </div>

        <div class="feedback-analysis">
          <h3>Feedback Analysis</h3>
          <div class="analysis-grid">
            <div class="analysis-item">
              <label>Sentiment Score:</label>
              <span id="sentimentScore">-</span>
            </div>
            <div class="analysis-item">
              <label>Response Rate:</label>
              <span id="responseRate">-</span>
            </div>
            <div class="analysis-item">
              <label>Top Issues:</label>
              <div id="topIssues" class="issues-list">
                <!-- Will be populated dynamically -->
              </div>
            </div>
            <div class="analysis-item">
              <label>Feature Requests:</label>
              <div id="featureRequests" class="requests-list">
                <!-- Will be populated dynamically -->
              </div>
            </div>
          </div>
        </div>

        <div class="feedback-wordcloud">
          <h3>Feedback Word Cloud</h3>
          <div id="wordCloud" class="wordcloud-container">
            <!-- Word cloud will be generated dynamically -->
          </div>
        </div>
      </div>
    `;
  }

  createPerformanceContent() {
    return `
      <div class="performance-grid">
        <div class="chart-container">
          <h3>Performance Metrics</h3>
          <canvas id="performanceMetricsChart"></canvas>
        </div>

        <div class="performance-stats">
          <h3>Performance Statistics</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <label>Average Load Time:</label>
              <span id="avgLoadTime">-</span>
            </div>
            <div class="stat-item">
              <label>Error Rate:</label>
              <span id="errorRate">-</span>
            </div>
            <div class="stat-item">
              <label>Cache Hit Rate:</label>
              <span id="cacheHitRate">-</span>
            </div>
            <div class="stat-item">
              <label>Memory Usage:</label>
              <span id="memoryUsage">-</span>
            </div>
          </div>
        </div>

        <div class="chart-container">
          <h3>Resource Usage Over Time</h3>
          <canvas id="resourceUsageChart"></canvas>
        </div>

        <div class="performance-alerts">
          <h3>Performance Alerts</h3>
          <div id="performanceAlerts" class="alerts-list">
            <!-- Alerts will be populated dynamically -->
          </div>
        </div>
      </div>
    `;
  }

  createInsightsContent() {
    return `
      <div class="insights-grid">
        <div class="insights-summary">
          <h3>Executive Summary</h3>
          <div id="executiveSummary" class="summary-content">
            <!-- Will be populated dynamically -->
          </div>
        </div>

        <div class="recommendations">
          <h3>Recommendations</h3>
          <div id="recommendations" class="recommendations-list">
            <!-- Will be populated dynamically -->
          </div>
        </div>

        <div class="trends-predictions">
          <h3>Trends & Predictions</h3>
          <div class="chart-container">
            <canvas id="trendsPredictionChart"></canvas>
          </div>
        </div>

        <div class="action-items">
          <h3>Priority Action Items</h3>
          <div id="actionItems" class="action-items-list">
            <!-- Will be populated dynamically -->
          </div>
        </div>
      </div>
    `;
  }

  attachDashboardEventListeners(dashboard) {
    // Navigation
    dashboard.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchView(e.target.dataset.view);
      });
    });

    // Date range change
    dashboard.querySelector('#dateRangeSelect').addEventListener('change', (e) => {
      this.dateRange = e.target.value;
      this.refreshDashboard();
    });

    // Export button
    dashboard.querySelector('#exportDashboardBtn').addEventListener('click', () => {
      this.exportDashboardReport();
    });
  }

  switchView(viewName) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Update content
    document.querySelectorAll('.dashboard-view').forEach(view => {
      view.classList.toggle('active', view.id === `${viewName}View`);
    });

    this.currentView = viewName;
    this.refreshCurrentView();
  }

  refreshDashboard() {
    this.refreshCurrentView();
  }

  refreshCurrentView() {
    switch (this.currentView) {
      case 'overview':
        this.refreshOverview();
        break;
      case 'usage':
        this.refreshUsage();
        break;
      case 'feedback':
        this.refreshFeedback();
        break;
      case 'performance':
        this.refreshPerformance();
        break;
      case 'insights':
        this.refreshInsights();
        break;
    }
  }

  refreshOverview() {
    if (!this.analyticsCollector) return;

    const summary = this.analyticsCollector.getSummary();
    const feedbackAnalytics = this.feedbackCollector ? this.feedbackCollector.getFeedbackAnalytics() : null;

    // Update metric cards
    document.getElementById('totalSessions').textContent = summary.totalSessions || 0;
    document.getElementById('totalExports').textContent = summary.exportStats?.total || 0;
    document.getElementById('totalFeedback').textContent = feedbackAnalytics?.total || 0;
    document.getElementById('avgRating').textContent = feedbackAnalytics?.averageRating?.toFixed(1) || 'N/A';

    // Create charts
    this.createActivityTimelineChart();
    this.createExportDistributionChart(summary);
    this.generateKeyInsights(summary, feedbackAnalytics);
  }

  createActivityTimelineChart() {
    const canvas = document.getElementById('activityTimelineChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const events = this.analyticsCollector.getAllEvents();
    
    // Group events by date
    const dailyActivity = this.groupEventsByDate(events);
    
    // Simple line chart implementation
    this.drawLineChart(ctx, dailyActivity);
  }

  createExportDistributionChart(summary) {
    const canvas = document.getElementById('exportDistributionChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const exportData = summary.exportStats?.byFormat || {};
    
    // Simple pie chart implementation
    this.drawPieChart(ctx, exportData);
  }

  drawLineChart(ctx, data) {
    // Simple line chart drawing
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const padding = 40;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw data points and lines
    const values = Object.values(data);
    const maxValue = Math.max(...values, 1);
    const xStep = (width - 2 * padding) / Math.max(values.length - 1, 1);
    const yScale = (height - 2 * padding) / maxValue;
    
    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    
    values.forEach((value, index) => {
      const x = padding + index * xStep;
      const y = height - padding - value * yScale;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      // Draw point
      ctx.fillRect(x - 2, y - 2, 4, 4);
    });
    
    ctx.stroke();
  }

  drawPieChart(ctx, data) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;
    
    ctx.clearRect(0, 0, width, height);
    
    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    if (total === 0) return;
    
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    let currentAngle = -Math.PI / 2;
    
    Object.entries(data).forEach(([key, value], index) => {
      const sliceAngle = (value / total) * 2 * Math.PI;
      
      // Draw slice
      ctx.fillStyle = colors[index % colors.length];
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();
      
      // Draw label
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
      
      ctx.fillStyle = 'white';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${key}: ${value}`, labelX, labelY);
      
      currentAngle += sliceAngle;
    });
  }

  groupEventsByDate(events) {
    const grouped = {};
    const dateRange = this.getDateRange();
    
    // Initialize all dates in range with 0
    for (let d = new Date(dateRange.start); d <= dateRange.end; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      grouped[dateKey] = 0;
    }
    
    // Count events per date
    events.forEach(event => {
      const dateKey = event.timestamp.split('T')[0];
      if (grouped.hasOwnProperty(dateKey)) {
        grouped[dateKey]++;
      }
    });
    
    return grouped;
  }

  getDateRange() {
    const now = new Date();
    const ranges = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
      'all': 365 * 10 // 10 years as "all time"
    };
    
    const days = ranges[this.dateRange] || 30;
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return { start, end: now };
  }

  generateKeyInsights(summary, feedbackAnalytics) {
    const insights = [];
    
    // Usage insights
    if (summary.totalSessions > 0) {
      insights.push({
        type: 'success',
        title: 'Strong User Engagement',
        description: `${summary.totalSessions} sessions recorded in selected period`
      });
    }
    
    // Export insights
    if (summary.exportStats?.total > 0) {
      const mostPopularFormat = Object.entries(summary.exportStats.byFormat || {})
        .sort(([,a], [,b]) => b - a)[0];
      
      if (mostPopularFormat) {
        insights.push({
          type: 'info',
          title: 'Popular Export Format',
          description: `${mostPopularFormat[0]} is the most used export format`
        });
      }
    }
    
    // Feedback insights
    if (feedbackAnalytics?.total > 0) {
      insights.push({
        type: feedbackAnalytics.averageRating >= 4 ? 'success' : 'warning',
        title: 'User Satisfaction',
        description: `Average rating: ${feedbackAnalytics.averageRating.toFixed(1)}/5`
      });
    }
    
    const insightsContainer = document.getElementById('keyInsights');
    insightsContainer.innerHTML = insights.map(insight => `
      <div class="insight-item ${insight.type}">
        <h4>${insight.title}</h4>
        <p>${insight.description}</p>
      </div>
    `).join('');
  }

  exportDashboardReport() {
    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange: this.dateRange,
      analytics: this.analyticsCollector?.getSummary(),
      feedback: this.feedbackCollector?.getFeedbackAnalytics(),
      insights: this.generateInsightsReport()
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `profitpath-analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  generateInsightsReport() {
    // Generate comprehensive insights based on all data
    const insights = [];
    
    if (this.analyticsCollector) {
      const summary = this.analyticsCollector.getSummary();
      
      // Usage patterns
      if (summary.totalSessions > 0) {
        insights.push({
          category: 'Usage',
          finding: `Total of ${summary.totalSessions} user sessions recorded`,
          recommendation: 'Continue monitoring user engagement patterns'
        });
      }
      
      // Export patterns
      if (summary.exportStats?.total > 0) {
        insights.push({
          category: 'Exports',
          finding: `${summary.exportStats.total} total exports generated`,
          recommendation: 'Consider adding more export formats based on usage'
        });
      }
    }
    
    if (this.feedbackCollector) {
      const feedbackAnalytics = this.feedbackCollector.getFeedbackAnalytics();
      
      if (feedbackAnalytics.total > 0) {
        insights.push({
          category: 'Feedback',
          finding: `${feedbackAnalytics.total} feedback items with average rating of ${feedbackAnalytics.averageRating.toFixed(1)}`,
          recommendation: feedbackAnalytics.averageRating < 4 ? 'Focus on addressing user concerns' : 'Maintain current quality standards'
        });
      }
    }
    
    return insights;
  }

  // Placeholder methods for other views
  refreshUsage() {
    console.log('Refreshing usage view...');
  }

  refreshFeedback() {
    console.log('Refreshing feedback view...');
  }

  refreshPerformance() {
    console.log('Refreshing performance view...');
  }

  refreshInsights() {
    console.log('Refreshing insights view...');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedAnalyticsDashboard;
} else {
  window.AdvancedAnalyticsDashboard = AdvancedAnalyticsDashboard;
}
