import { calc, getCacheStats } from '../../src/calculations/index';
import { fmtMoney0 } from '../../src/calculations/currency';
import { escapeHtml } from '../services/miscService';

/** Debug (raw calc output) and performance (cache stats) panels, plus the global error surfacer. */

const $ = (sel: string) => document.querySelector<HTMLElement>(sel);

// Global error handler to surface errors into the debug panel for easier debugging
window.addEventListener('error', (ev) => {
  const dbg = $('#debugPanel');
  const msg = ev?.error?.stack || ev?.message || String(ev);
  console.error('Uncaught error:', ev.error || ev.message || ev);
  if (dbg) dbg.textContent = 'Uncaught error: ' + msg;
});

// Debug panel toggle wiring: collapsible panel above the simple chart
export function initDebugPanel(getState: () => any): void {
  const toggleEl = $('#debugToggle');
  const bodyEl = $('#debugBody');
  const preEl = $('#debugPanel');
  if (!toggleEl || !bodyEl || !preEl) return;
  const toggle: HTMLElement = toggleEl;
  const body: HTMLElement = bodyEl;
  const pre: HTMLElement = preEl;

  // Update pre with calc() output and set a concise summary on the toggle
  function refreshDebug() {
    // Only refresh if debug panel is initialized and visible
    if (!pre || pre.style.display === 'none') return;

    try {
      const res = calc(getState());
      pre.textContent = JSON.stringify(res, null, 2);
      pre.dataset.tooltip = 'Raw calculation engine output showing all computed metrics (for troubleshooting)';
      const isExpanded = !body.classList.contains('collapsed');
      const arrow = isExpanded ? '▼' : '▶';
      toggle.textContent = `${arrow} Debug — clients: ${res.clients || 0}, revenue: ${fmtMoney0(res.revenue || 0)}`;
    } catch (e) {
      pre.textContent = 'Error generating debug: ' + (e && e.stack ? e.stack : String(e));
      pre.dataset.tooltip = 'Error generating debug output';
      const isExpanded = !body.classList.contains('collapsed');
      const arrow = isExpanded ? '▼' : '▶';
      toggle.textContent = `${arrow} Debug — error`;
    }
  }

  // restore expanded state from localStorage
  const stored = localStorage.getItem('profitpath-debug-expanded');
  const expanded = stored === '1';
  if (expanded) {
    // Small delay to allow CSS transitions to animate
    setTimeout(() => {
      body.classList.remove('collapsed');
      body.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.textContent = toggle.textContent.replace(/^▶/, '▼');
      // Refresh debug data when panel is expanded on page load
      refreshDebug();
    }, 50);
  }

  toggle.addEventListener('click', () => {
    const isCollapsed = body.classList.toggle('collapsed');
    body.setAttribute('aria-hidden', isCollapsed ? 'true' : 'false');
    const expandedNow = !isCollapsed;
    toggle.setAttribute('aria-expanded', expandedNow ? 'true' : 'false');
    toggle.textContent = (expandedNow ? '▼' : '▶') + toggle.textContent.slice(1);
    localStorage.setItem('profitpath-debug-expanded', expandedNow ? '1' : '0');
    // refresh content when expanding
    if (expandedNow) refreshDebug();
  });

  // refresh periodically (keeps the debug info up to date while editing)
  setInterval(refreshDebug, 1500);
  // initial refresh
  refreshDebug();
}

// Performance monitoring panel (Advanced feature)
export function initPerfPanel(): void {
  const toggleEl = $('#perfToggle');
  const bodyEl = $('#perfBody');
  const panelEl = $('#perfPanel');
  if (!toggleEl || !bodyEl || !panelEl) return;
  const toggle: HTMLElement = toggleEl;
  const body: HTMLElement = bodyEl;
  const panel: HTMLElement = panelEl;

  let perfInterval: ReturnType<typeof setInterval> | null = null;

  function refreshPerf() {
    if (!panel || body.classList.contains('collapsed')) return;

    try {
      const stats = getCacheStats();
      const html = `
        <div title="Number of cached calculation results (improves performance by avoiding redundant calculations)"><span class="perf-label">Cache:</span> <span class="perf-value">${stats.size} / ${stats.maxSize}</span> entries</div>
        <div title="Percentage of calculations served from cache (higher is better)"><span class="perf-label">Hit rate:</span> <span class="perf-value">${stats.hitRate}%</span> (${stats.hits} hits, ${stats.misses} misses)</div>
        <div title="Time taken for the most recent calculation"><span class="perf-label">Last calc:</span> <span class="perf-value">${stats.lastCalcMs}ms</span></div>
        <div title="Total number of calculations performed this session"><span class="perf-label">Total calcs:</span> <span class="perf-value">${stats.totalCalcs}</span></div>
      `;
      panel.innerHTML = html;
      const isExpanded = !body.classList.contains('collapsed');
      const arrow = isExpanded ? '▼' : '▶';
      toggle.textContent = `${arrow} Performance — ${stats.hitRate}% hit rate`;
    } catch (e) {
      panel.innerHTML = '<div>Error: ' + escapeHtml(e.message) + '</div>';
      const isExpanded = !body.classList.contains('collapsed');
      const arrow = isExpanded ? '▼' : '▶';
      toggle.textContent = `${arrow} Performance — error`;
    }
  }

  // Restore expanded state from localStorage
  const stored = localStorage.getItem('profitpath-perf-expanded');
  const expanded = stored === '1';
  if (expanded) {
    // Small delay to allow CSS transitions to animate
    setTimeout(() => {
      body.classList.remove('collapsed');
      body.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.textContent = toggle.textContent.replace(/^▶/, '▼');
      // Refresh performance data when panel is expanded on page load
      refreshPerf();
    }, 50);
  }

  toggle.addEventListener('click', () => {
    const isCollapsed = body.classList.toggle('collapsed');
    body.setAttribute('aria-hidden', isCollapsed ? 'true' : 'false');
    const expandedNow = !isCollapsed;
    toggle.setAttribute('aria-expanded', expandedNow ? 'true' : 'false');
    toggle.textContent = (expandedNow ? '▼' : '▶') + toggle.textContent.slice(1);
    localStorage.setItem('profitpath-perf-expanded', expandedNow ? '1' : '0');

    if (expandedNow) {
      refreshPerf();
      perfInterval = setInterval(refreshPerf, 2000);
    } else if (perfInterval) {
      clearInterval(perfInterval);
      perfInterval = null;
    }
  });

  // Also update perf display on render
  const originalRender = window.render;
  window.render = function (...args: any[]) {
    originalRender.apply(this, args);
    if (!body.classList.contains('collapsed')) {
      refreshPerf();
    }
  };
}
