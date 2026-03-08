// Miscellaneous Helpers and UI Logic
import { validateAndSanitizeLoadedState } from './stateManager';

export function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function setStateFromInputs() {
  state.mode = $('#modeSelect').value;

  // Validate and sanitize inputs
  state.employees = Math.max(1, Math.floor(safeParseNumber($('#employees').value, 1)));
  state.employeePay = Math.max(0, safeParseNumber($('#employeePay').value, 0));
  state.monthlyCosts = Math.max(0, safeParseNumber($('#monthlyCosts').value, 0));
  state.productiveUtilizationPct = clamp(safeParseNumber($('#productiveUtilizationPct').value, 80), 0, 100);
  state.targetUtilizationPct = clamp(safeParseNumber($('#targetUtilizationPct').value, 75), 0, 150);
  state.lockMix = Boolean($('#lockMix')?.checked);
}

export function onTableInput(e) {
  const el = e.target;
  if (!(el instanceof HTMLInputElement)) return;

  const k = el.dataset.k;
  const i = Number(el.dataset.i);
  if (!k || !Number.isFinite(i)) return;

  const o = state.offerings[i];
  if (!o) return;

  // Validate and sanitize input based on field type
  let value = el.value;
  let validationError = null;

  if (k === 'priceMonthly') {
    const parsed = safeParseNumber(value, 0);
    if (parsed <= 0) {
      validationError = 'Price must be greater than $0';
      value = 0;
    } else {
      value = parsed;
    }
  } else if (k === 'variableCostPerSession') {
    const parsed = safeParseNumber(value, 0);
    if (parsed < 0) {
      validationError = 'Variable costs cannot be negative';
      value = 0;
    } else {
      value = parsed;
    }
  } else if (k === 'sessionsPerYear') {
    const parsed = Math.floor(safeParseNumber(value, 0));
    if (parsed <= 0) {
      validationError = 'Must have at least 1 session per year';
      value = 1;
    } else {
      value = parsed;
    }
  } else if (k === 'hoursPerSession') {
    const parsed = safeParseNumber(value, 0);
    if (parsed <= 0) {
      validationError = 'Session must take at least 0.1 hours';
      value = 0.1;
    } else {
      value = parsed;
    }
  } else if (k === 'currentClients') {
    const parsed = Math.floor(safeParseNumber(value, 0));
    if (parsed < 0) {
      validationError = 'Client count cannot be negative';
      value = 0;
    } else {
      value = parsed;
    }
  } else if (k === 'mixPct') {
    const parsed = safeParseNumber(value, 0, 0, 100);
    value = parsed;
  }

  // Show validation error if any and provide auto-fix for some cases
  if (validationError) {
    // Validation error handled-value has been sanitized

    // Auto-fix common issues
    if (k === 'priceMonthly' && value === 0 && o.priceMonthly === 0) {
      // Suggest a reasonable default price
    }

  }

  if (k === 'name') {
    o.name = el.value;
  } else if (k === 'mixPct' && state.mode === 'forecast' && state.lockMix) {
    rebalanceMix(i, value);
  } else {
    o[k] = value;
  }

  // Update state and outputs in-place without re-rendering the entire table to preserve focus.
  try {
    persistState();
  } catch (e) {
    console.warn('Failed to persist state on input:', e);
  }
  try {
    const metrics = calc();
    updateOutputs(metrics);
    updateValidationDisplay(); // Update validation messages after calculations
  } catch (e) {
    console.warn('Failed to refresh outputs on input:', e);
  }
  // If changing mix in locked forecast mode, re-render to update other mix inputs
  if (k === 'mixPct' && state.mode === 'forecast' && state.lockMix) {
    render();
  }
}

export function onTableClick(e) {
  const btn = e.target.closest('button');
  if (!btn) return;

  const action = btn.dataset.action;
  if (!action) return;

  if (action === 'removeOffering') {
    const i = Number(btn.dataset.i);
    if (Number.isFinite(i)) {
      state.offerings.splice(i, 1);
      if (state.offerings.length === 0) state.offerings = defaultOfferings();
      render();
    }
  }
}

export function addOffering() {
  state.offerings.push({
    id: uuid(),
    name: 'Offering ' + (state.offerings.length + 1),
    priceMonthly: 100,
    sessionsPerYear: 12,
    hoursPerSession: 1.0,
    variableCostPerSession: 0,
    mixPct: 0,
    currentClients: 0,
  });
  render();
}

export function resetDefaults() {
  state.offerings = defaultOfferings();
  state.employees = 1;
  state.employeePay = 60000;
  state.monthlyCosts = 250;
  state.productiveUtilizationPct = 80;
  state.targetUtilizationPct = 75;
  state.mode = 'forecast';
  localStorage.removeItem('profitpath-state');
  render();
}

export function exportAsCSV() {
  let results;
  try {
    // Use calc from global scope or handle gracefully if not available
    if (typeof calc === 'function') {
      results = calc();
    } else {
      // Fallback: use current state directly
      results = { state: state, metrics: {} };
      console.warn('calc function not available, using current state');
    }
  } catch (e) {
    console.error('Calculation failed in exportAsCSV:', e);
    alert('Error: Could not generate CSV export due to calculation error. Please check your inputs.');
    return;
  }

  // CSV header with summary metrics
  const lines = [
    'ProfitPath Business Analysis Report',
    'Generated: ' + (new Date().toLocaleString()),
    'Analysis Mode: ' + (state.mode === 'forecast' ? 'Forecast(Planning)' : 'Current(Operations Analysis)'),
    '',
    'BUSINESS PARAMETERS',
    'Parameter,Value,Unit',
    'Number of Employees, ' + (state.employees) + ', people',
    'Annual Employee Compensation, ' + (fmtMoney0(state.employeePay)) + ', USD / year',
    'Monthly Overhead Costs, ' + (fmtMoney0(state.monthlyCosts)) + ', USD / month',
    'Productive Utilization Target, ' + (fmtPct1(state.productiveUtilizationPct)) + ',% of available hours',
    'Overall Utilization Target, ' + (fmtPct1(state.targetUtilizationPct)) + ',% of total capacity',
    '',
    'FINANCIAL RESULTS',
    'Metric,Value,Unit',
    'Total Annual Revenue, ' + (fmtMoney0(results.revenue)) + ', USD / year',
    'Total Variable Costs, ' + (fmtMoney0(results.variableCosts)) + ', USD / year',
    'Gross Contribution Margin, ' + (fmtMoney0(Math.max(0, (results.revenue || 0) - (results.variableCosts || 0)))) + ', USD / year',
    'Fixed Overhead Costs, ' + (fmtMoney0(results.annualFixedCosts)) + ', USD / year',
    'Net Profit(Loss), ' + (fmtMoney0(results.income)) + ', USD / year',
    'Profit Margin, ' + (fmtPct1(((results.income || 0) / (results.revenue || 1)) * 100)) + ',% of revenue',
    'Total Billable Hours, ' + (fmtInt(results.serviceHours || 0)) + ', hours / year',
    'Capacity Utilization, ' + (fmtPct1(results.capacityPct || 0)) + ',% of total capacity',
    '',
    'SERVICE OFFERINGS BREAKDOWN',
    'Service Name,Monthly Price,Sessions per Year,Hours per Session,Variable Cost per Session,Client Mix %,Current Clients,Projected Annual Revenue,Capacity Required',
  ];

  state.offerings.forEach((o) => {
    const annualRevenue = o.priceMonthly * 12 * (state.mode === 'forecast' ? o.mixPct / 100 : o.currentClients);
    const capacityRequired = state.mode === 'forecast' ? Math.ceil((o.sessionsPerYear * state.employees * state.productiveUtilizationPct / 100) / o.sessionsPerYear) : o.currentClients;
    lines.push(
      '"' + (o.name) + '", ' + (o.priceMonthly) + ', ' + (o.sessionsPerYear) + ', ' + (o.hoursPerSession) + ', ' + (o.variableCostPerSession) + ', ' + (o.mixPct) + ', ' + (o.currentClients) + ', ' + (fmtMoney0(annualRevenue)) + ', ' + (capacityRequired)
    );
  });

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'profitpath-export-' + (new Date().toISOString().split('T')[0]) + '.csv');
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function shareViaEmail() {
  let results;
  try {
    results = calc();
  } catch (e) {
    console.error('Calculation failed in shareViaEmail:', e);
    alert('Error: Could not generate email report due to calculation error. Please check your inputs.');
    return;
  }

  const subject = encodeURIComponent('ProfitPath Report - ' + (new Date().toLocaleDateString()));
  const body = encodeURIComponent('ProfitPath Business Analysis Report\n\nGenerated: ' + (new Date().toLocaleString()) + '\n\nBUSINESS SUMMARY:\n  - Mode: ' + (state.mode) + '\n  - Employees: ' + (state.employees) + '\n  - Employee Pay: ' + (fmtMoney0(state.employeePay)) + '\n  - Monthly Overhead: ' + (fmtMoney0(state.monthlyCosts)) + '\n  - Productive Utilization: ' + (fmtPct1(state.productiveUtilizationPct)) + '\n\nFINANCIAL RESULTS:\n  - Total Revenue: ' + (fmtMoney0(results.revenue || 0)) + '\n  - Total Variable Costs: ' + (fmtMoney0(results.variableCosts || 0)) + '\n  - Net Profit: ' + (fmtMoney0(results.income || 0)) + '\n  - Profit Margin: ' + (fmtPct1(((results.income || 0) / (results.revenue || 1)) * 100)) + '\n  - Utilization: ' + (fmtPct1(results.capacityPct || 0)) + '\n\nSERVICE OFFERINGS:\n' + (state.offerings.map(o => '- ' + (o.name) + ': ' + (fmtMoney0(o.priceMonthly)) + '/month').join('\n')) + '\n\n--- This report was generated using ProfitPath - a service business simulator.\nFor the full report with charts and detailed analysis, please see the attached export file.\n\nView the interactive simulator: ' + (window.location.origin) + (window.location.pathname));

  const mailtoLink = 'mailto:?subject=' + (subject) + '&body=' + (body);
  window.open(mailtoLink);
}

export function showScheduleDialog() {
  // Create modal dialog
  const modal = document.createElement('div');
  modal.innerHTML = '<div id="scheduleModal" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000;"><div class="modal-content" style="background:white;padding:30px;border-radius:8px;max-width:500px;width:90%;box-shadow:0 10px 25px rgba(0,0,0,0.2);"><h3 style="margin-top:0;color:#1f2937;">Automated Report Scheduling</h3><p style="color:#6b7280;margin-bottom:20px;">Schedule automatic report generation and downloads.</p><form id="scheduleForm"><div style="margin-bottom:15px;"><label style="display:block;margin-bottom:5px;font-weight:500;">Frequency:</label><select id="scheduleFrequency" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:4px;"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div><div style="margin-bottom:15px;"><label style="display:block;margin-bottom:5px;font-weight:500;">Format:</label><select id="scheduleFormat" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:4px;"><option value="pdf">PDF Report</option><option value="excel">Excel Workbook</option><option value="csv">CSV Spreadsheet</option><option value="html">HTML Page</option></select></div><div style="margin-bottom:20px;"><label style="display:block;margin-bottom:5px;font-weight:500;">Next Run:</label><div id="nextRunTime" style="color:#6b7280;font-size:0.9em;">Next run: calculating...</div></div><div style="display:flex;gap:10px;justify-content:flex-end;"><button type="button" id="cancelSchedule" style="padding:8px 16px;border:1px solid #d1d5db;background:white;border-radius:4px;cursor:pointer;">Cancel</button><button type="submit" style="padding:8px 16px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;">Start Scheduling</button></div></form><div id="scheduleStatus" style="margin-top:15px;padding:10px;border-radius:4px;display:none;">...</div></div></div>';

  document.body.appendChild(modal);

  // Update next run time
  updateNextRunTime();

  // Event listeners
  document.getElementById('cancelSchedule').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  document.getElementById('scheduleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    startScheduling();
    document.body.removeChild(modal);
  });

  document.getElementById('scheduleFrequency').addEventListener('change', updateNextRunTime);

  // Overlay click handler
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
}

export function updateNextRunTime() {
  const frequency = document.getElementById('scheduleFrequency')?.value || 'daily';
  const now = new Date();
  let nextRun;

  switch (frequency) {
    case 'daily':
      nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      nextRun = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      break;
  }

  const nextRunElement = document.getElementById('nextRunTime');
  if (nextRunElement) {
    nextRunElement.textContent = 'Next run: ' + nextRun.toLocaleString();
  }
}

export function startScheduling() {
  const frequency = document.getElementById('scheduleFrequency').value;
  const format = document.getElementById('scheduleFormat').value;

  // Clear any existing schedule
  if (window.scheduleInterval) {
    clearInterval(window.scheduleInterval);
  }

  let intervalMs;
  switch (frequency) {
    case 'daily':
      intervalMs = 24 * 60 * 60 * 1000; // 24 hours
      break;
    case 'weekly':
      intervalMs = 7 * 24 * 60 * 60 * 1000; // 7 days
      break;
    case 'monthly':
      intervalMs = 30 * 24 * 60 * 60 * 1000; // ~30 days
      break;
  }

  // Show status
  const statusElement = document.getElementById('scheduleStatus');
  if (statusElement) {
    statusElement.style.display = 'block';
    statusElement.style.background = '#d1fae5';
    statusElement.style.color = '#065f46';
    statusElement.textContent = '✅ Scheduling started: ' + format.toUpperCase() + ' reports every ' + frequency;
  }

  // Start scheduling
  window.scheduleInterval = setInterval(() => {
    try {
      switch (format) {
        case 'pdf':
          exportAsPDF();
          break;
        case 'excel':
          exportAsExcel();
          break;
        case 'csv':
          exportAsCSV();
          break;
        case 'html':
          exportAsHTML();
          break;
      }

      // Track export event
      if (window.profitPathAnalytics) {
        window.profitPathAnalytics.trackExport(format, 1, { scheduled: true });
      }

      // Show contextual feedback prompt
      if (window.feedbackUI) {
        window.feedbackUI.showContextualPrompt({
          action: 'scheduled ' + (format.toUpperCase()) + ' export',
          feature: 'exports'
        }, 3000);
      }

      // Show download notification
      showNotification('Scheduled ' + (format.toUpperCase()) + ' report downloaded', 'success');
    } catch (error) {
      console.error('Scheduled export failed:', error);
      showNotification('Scheduled export failed', 'error');
    }
  }, intervalMs);

  // Store schedule info for persistence
  localStorage.setItem('profitpath-schedule', JSON.stringify({
    frequency,
    format,
    started: Date.now(),
    intervalMs
  }));

  showNotification('Report scheduling started(' + (frequency) + ' ' + (format.toUpperCase()) + ')', 'success');
}

export function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = 'position: fixed;top: 20px;right: 20px;padding: 12px 16px;border-radius: 6px;color: white;font-weight: 500;z-index: 3000;box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);max-width: 300px;';

  if (type === 'success') {
    notification.style.background = '#059669';
  } else if (type === 'error') {
    notification.style.background = '#dc2626';
  } else {
    notification.style.background = '#3b82f6';
  }

  notification.textContent = message;
  document.body.appendChild(notification);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      document.body.removeChild(notification);
    }
  }, 5000);
}

export function restoreScheduling() {
  const scheduleData = localStorage.getItem('profitpath-schedule');
  if (scheduleData) {
    try {
      const { started, intervalMs } = JSON.parse(scheduleData);
      const elapsed = Date.now() - started;

      if (elapsed < intervalMs) {
        // Schedule hasn't triggered yet, restore it
        const remaining = intervalMs - elapsed;
        setTimeout(() => {
          startScheduling();
        }, remaining);
      } else {
        // Schedule should have triggered, clear it
        localStorage.removeItem('profitpath-schedule');
      }
    } catch (error) {
      console.warn('Could not restore scheduling:', error);
      localStorage.removeItem('profitpath-schedule');
    }
  }
}

export async function exportAsExcel() {
  // Lazy load XLSX library
  if (!window.XLSX) {
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    } catch (e) {
      console.error('Failed to load XLSX library:', e);
      alert('Error: Could not load Excel export library. Please try again.');
      return;
    }
  }

  let results;
  try {
    results = calc();
  } catch (e) {
    console.error('Calculation failed in exportAsExcel:', e);
    alert('Error: Could not generate Excel export due to calculation error. Please check your inputs.');
    return;
  }
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['ProfitPath Export'],
    [new Date().toLocaleString()],
    [''],
    ['SUMMARY'],
    ['Mode', state.mode],
    ['Employees', state.employees],
    ['Employee Pay', state.employeePay],
    ['Monthly Overhead', state.monthlyCosts],
    ['Productive Utilization', state.productiveUtilizationPct / 100],
    ['Target Utilization', state.targetUtilizationPct / 100],
    [''],
    ['RESULTS'],
    ['Total Revenue', results.revenue || 0],
    ['Total Variable Costs', results.variableCosts || 0],
    ['Contribution Margin', '=B13-B14'],
    ['Fixed Overhead', results.annualFixedCosts || 0],
    ['Net Profit', '=B15-B16'],
    ['Profit Margin', '=B17/B13'],
    ['Billable Hours', results.serviceHours || 0],
    ['Utilization', (results.capacityPct || 0) / 100],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 15 }];

  // Format as percentages where appropriate
  summarySheet['E6'] = { t: 'n', v: state.productiveUtilizationPct / 100, z: '0.00%' };
  summarySheet['E7'] = { t: 'n', v: state.targetUtilizationPct / 100, z: '0.00%' };
  summarySheet['E18'] = { t: 'n', v: (results.capacityPct || 0) / 100, z: '0.00%' };
  summarySheet['E19'] = { t: 'n', v: ((results.income || 0) / (results.revenue || 1)), z: '0.00%' };

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Offerings sheet
  const offeringsData = [
    ['Name', 'Price/Month', 'Sessions/Year', 'Hours/Session', 'Variable Cost/Session', 'Mix %', 'Current Clients', 'Annual Revenue', 'Clients Needed'],
  ];

  state.offerings.forEach((o) => {
    const annualRevenue = o.priceMonthly * 12 * (state.mode === 'forecast' ? o.mixPct / 100 : o.currentClients);
    const clientsNeeded = state.mode === 'forecast' ? Math.ceil((o.sessionsPerYear * state.employees * state.productiveUtilizationPct / 100) / o.sessionsPerYear) : o.currentClients;
    offeringsData.push([
      o.name,
      o.priceMonthly,
      o.sessionsPerYear,
      o.hoursPerSession,
      o.variableCostPerSession,
      o.mixPct / 100,
      o.currentClients,
      annualRevenue,
      clientsNeeded
    ]);
  });

  const offeringsSheet = XLSX.utils.aoa_to_sheet(offeringsData);
  offeringsSheet['!cols'] = [
    { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }
  ];

  // Format mix percentage column
  for (let i = 1; i < offeringsData.length; i++) {
    offeringsSheet[XLSX.utils.encode_cell({ r: i, c: 5 })].z = '0.00%';
  }

  XLSX.utils.book_append_sheet(workbook, offeringsSheet, 'Offerings');

  // Write file
  XLSX.writeFile(workbook, 'profitpath-export-' + (new Date().toISOString().split('T')[0]) + '.xlsx');

  // Track export event
  if (window.profitPathAnalytics) {
    window.profitPathAnalytics.trackExport('excel', 1);
  }

  // Show contextual feedback prompt
  if (window.feedbackUI) {
    window.feedbackUI.showContextualPrompt({
      action: 'Excel export completed',
      feature: 'exports'
    }, 2000);
  }
}

export async function exportAsPDF() {
  // Lazy load PDF and canvas libraries
  if (!window.jspdf) {
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    } catch (e) {
      console.error('Failed to load jsPDF library:', e);
      alert('Error: Could not load PDF export library. Please try again.');
      return;
    }
  }

  if (!window.html2canvas) {
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    } catch (e) {
      console.error('Failed to load html2canvas library:', e);
      alert('Error: Could not load chart capture library. Please try again.');
      return;
    }
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let results;
  try {
    // Use calc from global scope or handle gracefully if not available
    if (typeof calc === 'function') {
      results = calc();
    } else {
      // Fallback: use current state directly
      results = { state: state, metrics: {} };
      console.warn('calc function not available, using current state');
    }
  } catch (e) {
    console.error('Calculation failed in exportAsPDF:', e);
    alert('Error: Could not generate PDF export due to calculation error. Please check your inputs.');
    return;
  }

  // Title
  doc.setFontSize(20);
  doc.text('ProfitPath Report', 20, 30);

  // Date
  doc.setFontSize(12);
  doc.text('Generated: ' + (new Date().toLocaleString()), 20, 45);

  // Summary section
  doc.setFontSize(16);
  doc.text('Summary', 20, 65);

  doc.setFontSize(11);
  let yPos = 80;
  const lineHeight = 7;

  doc.text('Mode: ' + (state.mode), 20, yPos);
  yPos += lineHeight;
  doc.text('Employees: ' + (state.employees), 20, yPos);
  yPos += lineHeight;
  doc.text('Employee Pay: ' + (fmtMoney0(state.employeePay)), 20, yPos);
  yPos += lineHeight;
  doc.text('Monthly Overhead: ' + (fmtMoney0(state.monthlyCosts)), 20, yPos);
  yPos += lineHeight;
  doc.text('Productive Utilization: ' + (fmtPct1(state.productiveUtilizationPct)), 20, yPos);
  yPos += lineHeight;
  doc.text('Target Utilization: ' + (fmtPct1(state.targetUtilizationPct)), 20, yPos);

  // Results section
  yPos += lineHeight * 2;
  doc.setFontSize(16);
  doc.text('Results', 20, yPos);
  yPos += lineHeight * 2;

  doc.setFontSize(11);
  doc.text('Total Revenue: ' + (fmtMoney0(results.revenue || 0)), 20, yPos);
  yPos += lineHeight;
  doc.text('Total Variable Costs: ' + (fmtMoney0(results.variableCosts || 0)), 20, yPos);
  yPos += lineHeight;
  doc.text('Contribution Margin: ' + (fmtMoney0(Math.max(0, (results.revenue || 0) - (results.variableCosts || 0)))), 20, yPos);
  yPos += lineHeight;
  doc.text('Fixed Overhead: ' + (fmtMoney0(results.annualFixedCosts || 0)), 20, yPos);
  yPos += lineHeight;
  doc.text('Net Profit: ' + (fmtMoney0(results.income || 0)), 20, yPos);
  yPos += lineHeight;
  doc.text('Profit Margin: ' + (fmtPct1(((results.income || 0) / (results.revenue || 1)) * 100)), 20, yPos);
  yPos += lineHeight;
  doc.text('Billable Hours: ' + (fmtInt(results.serviceHours || 0)), 20, yPos);
  yPos += lineHeight;
  doc.text('Utilization: ' + (fmtPct1(results.capacityPct || 0)), 20, yPos);

  // Try to capture charts if they exist
  try {
    const chartElements = document.querySelectorAll('.chart-container svg, #utilizationGauge svg, #profitWaterfall svg');
    if (chartElements.length > 0) {
      // Add new page for charts
      doc.addPage();

      doc.setFontSize(16);
      doc.text('Visualizations', 20, 30);

      let chartYPos = 50;
      for (let i = 0; i < Math.min(chartElements.length, 2); i++) {
        try {
          const canvas = await html2canvas(chartElements[i], {
            backgroundColor: '#ffffff',
            scale: 2
          });
          const imgData = canvas.toDataURL('image/png');

          // Calculate dimensions to fit on page
          const imgWidth = 170;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (chartYPos + imgHeight > 270) {
            doc.addPage();
            chartYPos = 30;
          }

          doc.addImage(imgData, 'PNG', 20, chartYPos, imgWidth, imgHeight);
          chartYPos += imgHeight + 20;
        } catch (chartError) {
          console.warn('Could not capture chart:', chartError);
        }
      }
    }
  } catch (error) {
    console.warn('Could not add charts to PDF:', error);
  }

  // Add offerings table on new page if needed
  if (state.offerings.length > 0) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Service Offerings', 20, 30);

    doc.setFontSize(10);
    let tableY = 45;

    // Table headers
    doc.text('Name', 20, tableY);
    doc.text('Price/Month', 80, tableY);
    doc.text('Sessions/Year', 110, tableY);
    doc.text('Hours/Session', 140, tableY);
    doc.text('Annual Revenue', 170, tableY);

    tableY += 8;
    doc.line(20, tableY, 190, tableY);

    // Table data
    state.offerings.forEach((o) => {
      tableY += 6;
      if (tableY > 270) {
        doc.addPage();
        tableY = 30;
      }

      const annualRevenue = o.priceMonthly * 12 * (state.mode === 'forecast' ? o.mixPct / 100 : o.currentClients);
      doc.text(o.name.substring(0, 20), 20, tableY);
      doc.text(fmtMoney0(o.priceMonthly), 80, tableY);
      doc.text(o.sessionsPerYear.toString(), 110, tableY);
      doc.text(o.hoursPerSession.toString(), 140, tableY);
      doc.text(fmtMoney0(annualRevenue), 170, tableY);
    });
  }

  doc.save('profitpath-report-' + (new Date().toISOString().split('T')[0]) + '.pdf');

  // Track export event
  if (window.profitPathAnalytics) {
    window.profitPathAnalytics.trackExport('pdf', 1);
  }

  // Show contextual feedback prompt
  if (window.feedbackUI) {
    window.feedbackUI.showContextualPrompt({
      action: 'PDF export completed',
      feature: 'exports'
    }, 2000);
  }
}

export function exportAsHTML() {
  let results;
  try {
    // Use calc from global scope or handle gracefully if not available
    if (typeof calc === 'function') {
      results = calc();
    } else {
      // Fallback: use current state directly
      results = { state: state, metrics: {} };
      console.warn('calc function not available, using current state');
    }
  } catch (e) {
    console.error('Calculation failed in exportAsHTML:', e);
    alert('Error: Could not generate HTML export due to calculation error. Please check your inputs.');
    return;
  }

  // Create simple HTML content
  const htmlContent = '<!DOCTYPE html><html><head><title>ProfitPath Report</title><style>body{font-family:sans-serif;margin:20px;}</style></head><body><h1>ProfitPath Report</h1><p>Generated: ' + new Date().toLocaleDateString() + '</p><h2>Results</h2><p>Revenue: ' + (fmtMoney0(results.revenue || 0)) + '</p><p>Profit: ' + (fmtMoney0(results.income || 0)) + '</p></body></html>';

  // Download the HTML file
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'profitpath-report-' + new Date().toISOString().split('T')[0] + '.html');
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Track export event
  if (window.profitPathAnalytics) {
    window.profitPathAnalytics.trackExport('html', 1);
  }

  // Show contextual feedback prompt
  if (window.feedbackUI) {
    window.feedbackUI.showContextualPrompt({
      action: 'HTML export completed',
      feature: 'exports'
    }, 2000);
  }
}

export function getAllScenarios() {
  try {
    const saved = localStorage.getItem('profitpath-scenarios');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.warn('Failed to load scenarios:', e);
    return [];
  }
}

export function cleanup() {
  if (modal.parentNode) {
    document.body.removeChild(modal);
  }
  isDeletingScenario = false;
}

export function closeScenarioModal() {
  $('#scenariosModal').style.display = 'none';
}

export function encodeScenarioToURL(state) {
  try {
    // Create a clean copy of the state for sharing (exclude internal properties)
    const shareableState = {
      mode: state.mode,
      offerings: state.offerings.map(o => ({
        name: o.name,
        priceMonthly: o.priceMonthly,
        sessionsPerYear: o.sessionsPerYear,
        hoursPerSession: o.hoursPerSession,
        variableCostPerSession: o.variableCostPerSession,
        mixPct: o.mixPct,
        currentClients: o.currentClients
      })),
      employees: state.employees,
      employeePay: state.employeePay,
      monthlyCosts: state.monthlyCosts,
      productiveUtilizationPct: state.productiveUtilizationPct,
      targetUtilizationPct: state.targetUtilizationPct,
      lockMix: state.lockMix
    };

    // Encode to base64 (URL-safe)
    const jsonString = JSON.stringify(shareableState);
    const encoded = btoa(encodeURIComponent(jsonString));

    // Create shareable URL
    const baseUrl = window.location.origin + window.location.pathname;
    return baseUrl + '#scenario=' + encoded;
  } catch (e) {
    console.error('Failed to encode scenario:', e);
    return null;
  }
}

export function decodeScenarioFromURL() {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith('#scenario=')) return null;

    const encoded = hash.slice(10); // Remove '#scenario='
    const jsonString = decodeURIComponent(atob(encoded));
    const state = JSON.parse(jsonString);

    return state;
  } catch (e) {
    console.error('Failed to decode scenario from URL:', e);
    return null;
  }
}

export function loadScenarioFromURL() {
  const urlState = decodeScenarioFromURL();
  if (!urlState) return false;

  try {
    // Validate and merge URL state with defaults
    state.mode = urlState.mode || state.mode;
    state.employees = urlState.employees || state.employees;
    state.employeePay = urlState.employeePay || state.employeePay;
    state.monthlyCosts = urlState.monthlyCosts || state.monthlyCosts;
    state.productiveUtilizationPct = urlState.productiveUtilizationPct || state.productiveUtilizationPct;
    state.targetUtilizationPct = urlState.targetUtilizationPct || state.targetUtilizationPct;
    state.lockMix = urlState.lockMix !== undefined ? urlState.lockMix : state.lockMix;

    // Handle offerings
    if (Array.isArray(urlState.offerings)) {
      state.offerings = urlState.offerings.map(o => ({
        id: uuid(),
        name: o.name || 'Offering',
        priceMonthly: o.priceMonthly || 0,
        sessionsPerYear: o.sessionsPerYear || 0,
        hoursPerSession: o.hoursPerSession || 0,
        variableCostPerSession: o.variableCostPerSession || 0,
        mixPct: o.mixPct || 0,
        currentClients: o.currentClients || 0
      }));

      // Ensure at least one offering
      if (state.offerings.length === 0) {
        state.offerings = [{
          id: uuid(),
          name: 'Sample Offering',
          priceMonthly: 1000,
          sessionsPerYear: 12,
          hoursPerSession: 2,
          variableCostPerSession: 0,
          mixPct: 100,
          currentClients: 0,
        }];
      }
    }

    persistState(); // Save URL scenario to localStorage
    return true;
  } catch (e) {
    console.error('Failed to load scenario from URL:', e);
    return false;
  }
}

export function updateSocialMetaTags(scenarioData) {
  // Calculate key metrics for the meta description
  // Use calc from global scope or calculate manually if not available
  let revenue;
  if (typeof calc === 'function') {
    revenue = calc({ ...scenarioData, clients: scenarioData.offerings.reduce((sum, o) => sum + (o.currentClients || 0), 0) }).revenue;
  } else {
    // Manual calculation fallback
    revenue = scenarioData.offerings.reduce((sum, o) => sum + (o.priceMonthly * (o.currentClients || 0)), 0);
  }

  const description = 'Business Scenario: $' + revenue.toLocaleString() + ' / month revenue, ' + scenarioData.employees + ' employees, ' + scenarioData.offerings.length + ' services.';

  // Update meta tags
  updateMetaTag('description', description);
  updateMetaTag('og:description', description);
  updateMetaTag('twitter:description', description);
  updateMetaTag('og:title', 'ProfitPath — Business Scenario');
  updateMetaTag('twitter:title', 'ProfitPath — Business Scenario');

  // Update URL
  const shareUrl = encodeScenarioToURL(scenarioData);
  updateMetaTag('og:url', shareUrl);
  updateMetaTag('twitter:url', shareUrl);
}

export function updateMetaTag(name, content) {
  const meta = document.querySelector('meta[name="' + name + '"]') || document.querySelector('meta[property="' + name + '"]');
  if (meta) {
    meta.setAttribute('content', content);
  }
}

export function _initializeEmbeddableWidget() {
  const urlParams = new URLSearchParams(window.location.search);
  const isEmbed = urlParams.get('embed') === 'true';

  if (isEmbed) {
    // Hide non-essential UI elements for embedded version
    const elementsToHide = [
      '.header-actions',
      '#hamburgerBtn',
      '.footer',
      '.mobile-menu-overlay'
    ];

    elementsToHide.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.style.display = 'none';
      }
    });

    // Add embedded styling
    const style = document.createElement('style');
    style.textContent = 'body { margin: 0;padding: 0;} .container { max-width: none;padding: 0;} .header { margin-bottom: 0;padding: 10px;} .header h1 { font-size: 18px;margin: 0;} .card { margin: 10px 0;}';
    document.head.appendChild(style);

    // Adjust container for embedding
    const container = document.querySelector('.container');
    if (container) {
      container.style.maxWidth = '100%';
      container.style.padding = '0';
      container.style.margin = '0';
    }
  }
}

export function generateEmbedCode() {
  const shareUrl = encodeScenarioToURL(state);
  const embedUrl = shareUrl + (shareUrl.includes('?') ? '&' : '?') + 'embed=true';

  const embedCode = '<iframe src="' + embedUrl + '" width="100%" height="600" frameborder="0" style="border:1px solid #e5e7eb;border-radius:8px;"></iframe><p><a href="' + shareUrl + '" target="_blank">View full calculator →</a></p>';

  return embedCode;
}

export function showEmbedCode() {
  const embedCode = generateEmbedCode();

  // Copy to clipboard if available
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(embedCode).then(() => {
      alert('Embed code copied to clipboard!\n\nPaste this code into your website to embed the calculator.');
    }).catch(() => {
      // Fallback: show the code
      showEmbedDialog(embedCode);
    });
  } else {
    // Fallback: show the code
    showEmbedDialog(embedCode);
  }
}

export function showEmbedDialog(embedCode) {
  const dialog = document.createElement('div');
  dialog.style.cssText = 'position: fixed;top: 0;left: 0;right: 0;bottom: 0;background: rgba(0, 0, 0, 0.5);display: flex;align-items: center;justify-content: center;z-index: 10000;';

  dialog.innerHTML = '<div style="background:white;padding:20px;border-radius:8px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;"><h3 style="margin-top:0;">Embed Calculator Widget</h3><p>Copy this code to embed the calculator on your website:</p><textarea style="width:100%;height:150px;font-family:monospace;font-size:12px;" readonly>' + embedCode + '</textarea><div style="margin-top:15px;text-align:right;"><button class="embed-close-btn" style="padding:8px 16px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;">Close</button></div></div>';

  document.body.appendChild(dialog);

  // Add event listener for close button
  setTimeout(() => {
    const closeBtn = dialog.querySelector('.embed-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => dialog.remove());
    }
  }, 10);
}

export function shareScenario() {
  const shareUrl = encodeScenarioToURL(state);
  if (!shareUrl) {
    showShareErrorModal();
    return;
  }

  // Update social media meta tags with scenario data
  updateSocialMetaTags(state);

  // Show share success modal
  showShareSuccessModal(shareUrl);
}

function showShareErrorModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Share Failed</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <p>Failed to create shareable URL. Please try again.</p>
      </div>
      <div class="modal-footer">
        <button class="btn primary">OK</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listeners
  const closeBtn = modal.querySelector('.modal-close');
  const okBtn = modal.querySelector('.btn.primary');

  const closeModal = () => modal.remove();

  closeBtn.addEventListener('click', closeModal);
  okBtn.addEventListener('click', closeModal);
}

function showShareSuccessModal(shareUrl) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Share Scenario</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <p>Shareable URL copied to clipboard!</p>
        <p style="margin-top: 12px;">You can now share this link with stakeholders.</p>
        <p style="margin-top: 12px;">Social media previews will show scenario details.</p>
        <div style="margin-top: 16px;">
          <input type="text" readonly value="${shareUrl}" style="width: 100%; padding: 8px; border: 1px solid #dee2e6; border-radius: 6px; background: #f8f9fa; color: #333;" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn secondary">Copy URL</button>
        <button class="btn primary">Done</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Copy to clipboard functionality
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(shareUrl).catch(() => {
      // Silent fallback - URL is already visible
    });
  }

  // Add event listeners
  const closeBtn = modal.querySelector('.modal-close');
  const copyBtn = modal.querySelector('.btn.secondary');
  const doneBtn = modal.querySelector('.btn.primary');

  const closeModal = () => modal.remove();

  closeBtn.addEventListener('click', closeModal);
  doneBtn.addEventListener('click', closeModal);

  copyBtn.addEventListener('click', () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy URL';
        }, 2000);
      }).catch(() => {
        // Fallback: select the text
        const input = modal.querySelector('input[type="text"]');
        input.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy URL';
        }, 2000);
      });
    }
  });
}

export function toggleMobileMenu() {
  const overlay = $('#mobileMenuOverlay');
  const hamburger = $('#hamburgerBtn');

  if (overlay && hamburger) {
    const isActive = overlay.classList.contains('active');
    if (isActive) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }
}

export function openMobileMenu() {
  const overlay = $('#mobileMenuOverlay');
  const hamburger = $('#hamburgerBtn');

  if (overlay && hamburger) {
    overlay.classList.add('active');
    hamburger.classList.add('active');
  }
}

export function closeMobileMenu() {
  const overlay = $('#mobileMenuOverlay');
  const hamburger = $('#hamburgerBtn');

  if (overlay && hamburger) {
    overlay.classList.remove('active');
    hamburger.classList.remove('active');

    // Auto-collapse all submenus when closing menu
    const exportOptions = $('#mobileExportOptions');
    const templatesOptions = $('#mobileTemplatesOptions');
    const settingsSection = document.querySelector('.mobile-menu .settings-section');
    if (exportOptions) exportOptions.style.display = 'none';
    if (templatesOptions) templatesOptions.style.display = 'none';
    if (experienceSection) {
      experienceSection.style.display = 'none';
      // Clean up event listeners
      if (experienceSection._cleanupSettingsListener) {
        experienceSection._cleanupSettingsListener();
        delete experienceSection._cleanupSettingsListener;
      }
    }
    if (preferencesSection) {
      preferencesSection.style.display = 'none';
      // Clean up event listeners
      if (preferencesSection._cleanupSettingsListener) {
        preferencesSection._cleanupSettingsListener();
        delete preferencesSection._cleanupSettingsListener;
      }
    }
  }
}

export function loadIndustryTemplate(templateKey) {
  // Get INDUSTRY_TEMPLATES from global scope or handle gracefully
  const templates = typeof INDUSTRY_TEMPLATES !== 'undefined' ? INDUSTRY_TEMPLATES : window.INDUSTRY_TEMPLATES;

  if (!templates) {
    console.error('INDUSTRY_TEMPLATES not available');
    alert('Error: Industry templates not loaded. Please refresh the page.');
    return;
  }

  const template = templates[templateKey];
  if (!template) {
    alert('Template not found');
    return;
  }

  if (!confirm('Load ' + template.name + ' template ? This will replace your current configuration.')) {
    return;
  }

  try {
    // Get global state and render
    const currentState = globalThis.state || window.state;
    const renderFn = globalThis.render || window.render;

    if (!currentState) {
      console.error('State not available');
      alert('Error: Application state not loaded. Please refresh the page.');
      return;
    }

    // Load the template configuration
    Object.assign(currentState, template.config);
    validateAndSanitizeLoadedState();

    // Update the UI
    if (renderFn) renderFn();

    // Show success message
    alert('✅ Loaded ' + template.name + ' template!\n\nThis provides typical pricing and configuration for ' + template.description.toLowerCase() + '. Adjust the values as needed for your specific business.');
  } catch (e) {
    console.error('Error loading template:', e);
    alert('Error loading template. Please try again.');
  }
}

export function loadTestScenarios() {
  const urlParams = new URLSearchParams(window.location.search);

  if (!urlParams.has('loadTestScenarios')) {
    // Clear test scenarios if the flag is not present
    try {
      const existingScenarios = JSON.parse(localStorage.getItem('profitpath-scenarios') || '[]');
      const nonTestScenarios = existingScenarios.filter(s => !s.name?.startsWith('[TEST]'));
      localStorage.setItem('profitpath-scenarios', JSON.stringify(nonTestScenarios));
    } catch (e) {
      // Ignore localStorage errors
    }
    return false; // Flag not present, scenarios cleared
  }

  try {
    const scenarios = Object.entries(TEST_SCENARIOS).map(([key, scenario]) => ({
      id: 'test-' + key + '-' + Date.now(),
      name: '[TEST] ' + scenario.name,
      timestamp: Date.now() + Object.keys(TEST_SCENARIOS).indexOf(key) * 1000,
      data: scenario.data
    }));

    // Get existing scenarios
    let existingScenarios = [];
    try {
      const saved = localStorage.getItem('profitpath-scenarios');
      if (saved) {
        existingScenarios = JSON.parse(saved);
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // Add test scenarios (avoid duplicates)
    const allScenarios = [...existingScenarios];
    scenarios.forEach(testScenario => {
      const exists = allScenarios.some(s => s.name === testScenario.name);
      if (!exists) {
        allScenarios.push(testScenario);
      }
    });

    // Save back to localStorage
    localStorage.setItem('profitpath-scenarios', JSON.stringify(allScenarios));

    // Remove the flag from URL and show success
    const newUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, newUrl);

    // Show notification
    setTimeout(() => {
      alert('Loaded ' + scenarios.length + ' test scenarios!\n\nCheck the Scenarios menu for [TEST] scenarios.');
    }, 100);

    return scenarios.length;
  } catch (error) {
    console.error('Error loading test scenarios:', error);
    return 0;
  }
}

export function loadSpecificTestScenario(key) {
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has('testScenario') || urlParams.get('testScenario') !== key) {
    return false;
  }

  const scenario = TEST_SCENARIOS[key];
  if (!scenario) {
    console.error('Test scenario not found:', key);
    return false;
  }

  try {
    // Load the scenario data
    Object.assign(state, scenario.data);
    validateAndSanitizeLoadedState();

    // Remove the flag from URL
    const newUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, newUrl);

    return true;
  } catch (error) {
    console.error('Error loading test scenario:', error);
    return false;
  }
}

export function refreshDesktopSettings() {
  try {
    const settings = loadSettings ? loadSettings() : {};

    // Update experience level radios
    const experienceRadios = document.querySelectorAll('input[name="experienceLevel"]');
    experienceRadios.forEach(radio => {
      radio.checked = radio.value === settings.experienceLevel;
    });

    // Update feature checkboxes
    const checkboxes = document.querySelectorAll('#settingsMenu input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      const settingKey = checkbox.id;
      checkbox.checked = settings[settingKey];
    });
  } catch (error) {
    console.warn('Error refreshing desktop settings:', error);
  }
}

export function closeAllDropdowns() {
  // Close all types of dropdowns
  document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
  document.querySelectorAll('.settings-dropdown').forEach(d => d.classList.remove('active'));
  document.querySelectorAll('.templates-dropdown').forEach(d => d.classList.remove('active'));
  document.querySelectorAll('.export-dropdown').forEach(d => d.classList.remove('active'));
  // Also close templates and export menus
  const templatesMenu = $('#templatesMenu');
  if (templatesMenu) {
    templatesMenu.style.display = 'none';
  }
  const exportMenu = $('#exportMenu');
  if (exportMenu) {
    exportMenu.style.display = 'none';
  }
}

export function initializeSettings() {
  const settings = loadSettings();

  // Set experience level radio buttons
  const experienceRadios = document.querySelectorAll('input[name="experienceLevel"]');
  experienceRadios.forEach(radio => {
    radio.checked = radio.value === settings.experienceLevel;
    radio.addEventListener('change', (e) => {
      setExperienceLevel(e.target.value);
      initializeSettings(); // Reinitialize to apply new settings
      updateUIForSettings();
    });
  });

  // Set feature toggles
  const checkboxes = [
    'showAdvancedCalculations',
    'showDetailedBreakdown',
    'showComparisonTools',
    'showExportOptions',
    'showDebugPanel',
    'compactMode',
    'showTooltips'
  ];

  checkboxes.forEach(key => {
    const checkbox = $('#' + key);
    if (checkbox) {
      checkbox.checked = settings[key];
      checkbox.addEventListener('change', (e) => {
        updateSetting(key, e.target.checked);
        updateUIForSettings();
      });
    }
  });
}

export function updateUIForSettings() {
  const settings = loadSettings();

  // Show/hide elements based on feature gates
  const elementsToToggle = [
    { selector: '.advanced-calculations', setting: 'showAdvancedCalculations' },
    { selector: '.detailed-breakdown', setting: 'showDetailedBreakdown' },
    { selector: '.comparison-tools', setting: 'showComparisonTools' },
    { selector: '.export-options', setting: 'showExportOptions' },
    { selector: '.debug-panel', setting: 'showDebugPanel' }
  ];

  elementsToToggle.forEach(({ selector, setting }) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.style.display = settings[setting] ? 'block' : 'none';
    });
  });

  // Apply compact mode
  document.body.classList.toggle('compact-mode', settings.compactMode);

  // Update tooltips visibility
  // This would require additional implementation
}

export function _closeAllMobileSubmenus() {
  try {
    document.querySelectorAll('.mobile-submenu').forEach(el => {
      if (el && el.style) el.style.display = 'none';
    });
    // Also hide known submenu containers
    const containers = ['#mobileTemplatesOptions', '#mobileExportOptions', '#mobileShareOptions'];
    containers.forEach(sel => {
      const c = document.querySelector(sel);
      if (c && c.style) c.style.display = 'none';
    });
  } catch (e) {
    // Fail silently in environments without DOM
  }
}

export function setupDesktopMenuButtons() {
  const analyticsBtn = $('#analyticsBtn');
  if (analyticsBtn) {
    analyticsBtn.addEventListener('click', () => {
      // More robust check for analytics UI
      const checkAnalyticsUI = () => {
        if (window.profitPathAnalyticsUI) {
          // Check if method exists on instance or prototype
          if (typeof window.profitPathAnalyticsUI.showAnalyticsDashboard === 'function') {
            window.profitPathAnalyticsUI.showAnalyticsDashboard();
          } else if (typeof window.profitPathAnalyticsUI.constructor.prototype.showAnalyticsDashboard === 'function') {
            // Call via prototype if instance method not available
            window.profitPathAnalyticsUI.constructor.prototype.showAnalyticsDashboard.call(window.profitPathAnalyticsUI);
          } else {
            console.warn('Analytics UI method not available, retrying...');
            setTimeout(checkAnalyticsUI, 100);
          }
        } else {
          console.warn('Analytics UI not loaded yet');
          setTimeout(checkAnalyticsUI, 100);
        }
      };
      checkAnalyticsUI();
    });
  }

  const desktopFeedbackBtn = $('#desktopFeedbackBtn');
  if (desktopFeedbackBtn) {
    desktopFeedbackBtn.addEventListener('click', () => {
      // More robust check for feedback UI
      const checkFeedbackUI = () => {
        if (window.feedbackUI) {
          // Check if method exists on instance or prototype
          if (typeof window.feedbackUI.openFeedbackModal === 'function') {
            window.feedbackUI.openFeedbackModal();
          } else if (typeof window.feedbackUI.constructor.prototype.openFeedbackModal === 'function') {
            // Call via prototype if instance method not available
            window.feedbackUI.constructor.prototype.openFeedbackModal.call(window.feedbackUI);
          } else {
            console.warn('Feedback UI method not available, retrying...');
            setTimeout(checkFeedbackUI, 100);
          }
        } else {
          console.warn('Feedback UI not loaded yet');
          setTimeout(checkFeedbackUI, 100);
        }
      };
      checkFeedbackUI();
    });
  }
}

export function getSelectedComparisonScenarios() {
  const scenario1Id = $('#compareScenario1').value;
  const scenario2Id = $('#compareScenario2').value;
  return { scenario1Id, scenario2Id };
}

export function populateComparisonDropdowns() {
  const scenarios = getAllScenarios();
  const select1 = $('#compareScenario1');
  const select2 = $('#compareScenario2');
  if (!select1 || !select2) return;

  select1.innerHTML = '<option value="">Select first scenario...</option>';
  select2.innerHTML = '<option value="">Select second scenario...</option>';

  scenarios.forEach(s => {
    const option1 = document.createElement('option');
    option1.value = s.id;
    option1.textContent = s.name;
    select1.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = s.id;
    option2.textContent = s.name;
    select2.appendChild(option2);
  });
}

export function renderComparisonResults(metrics1, metrics2) {
  const comparisonResultsEl = $('#comparisonResults');
  if (!comparisonResultsEl) return;

  // Render into the wrapper div, not directly into comparisonResultsEl
  const tableWrap = comparisonResultsEl.querySelector('.comparison-table-wrap');
  if (!tableWrap) return;

  const metricsToCompare = [
    { label: 'Clients', key: 'clients', format: fmtInt },
    { label: 'Annual Sessions', key: 'annualSessions', format: fmtInt },
    { label: 'Service Hours', key: 'serviceHours', format: fmtInt },
    { label: 'Utilization', key: 'utilizationPct', format: fmtPct1 },
    { label: 'Revenue', key: 'revenue', format: fmtMoney0 },
    { label: 'Fixed Costs', key: 'annualFixedCosts', format: fmtMoney0 },
    { label: 'Payroll', key: 'annualPayroll', format: fmtMoney0 },
    { label: 'Variable Costs', key: 'annualVariableCosts', format: fmtMoney0 },
    { label: 'Net Income', key: 'netIncome', format: fmtMoney0 },
    { label: 'Break-Even Clients', key: 'breakEvenClients', format: fmtInt },
    { label: 'Break-Even Revenue', key: 'breakEvenRevenue', format: fmtMoney0 },
    { label: 'Contribution Margin', key: 'contributionMarginPerClient', format: fmtMoney0 },
  ];

  let tableHtml = '<table class="comparison-table"><thead><tr><th>Metric</th><th class="scenario-col">Scenario 1</th><th class="scenario-col">Scenario 2</th><th class="difference-col">Difference</th></tr></thead><tbody>';

  metricsToCompare.forEach(m => {
    const val1 = metrics1[m.key];
    const val2 = metrics2[m.key];
    const diff = val2 - val1;

    let diffClass = 'difference-neutral';
    if (m.key.includes('income') || m.key.includes('revenue') || m.key.includes('margin')) {
      if (diff > 0) diffClass = 'difference-positive';
      else if (diff < 0) diffClass = 'difference-negative';
    } else if (m.key.includes('cost')) {
      if (diff > 0) diffClass = 'difference-negative';
      else if (diff < 0) diffClass = 'difference-positive';
    } else if (m.key.includes('utilization') || m.key.includes('clients') || m.key.includes('sessions') || m.key.includes('hours')) {
      if (diff > 0) diffClass = 'difference-positive';
      else if (diff < 0) diffClass = 'difference-negative';
    }

    tableHtml += '<tr><td class="metric-name">' + m.label + '</td><td class="scenario-col">' + m.format(val1) + '</td><td class="scenario-col">' + m.format(val2) + '</td><td class="difference-col ' + diffClass + '">' + m.format(diff) + '</td></tr>';
  });

  tableHtml += '</tbody></table>';
  tableWrap.innerHTML = tableHtml; // Assign to wrapper
  comparisonResultsEl.style.display = 'block';
}

export function handleComparison() {
  const comparisonErrorEl = $('#comparisonError');
  if (comparisonErrorEl) comparisonErrorEl.style.display = 'none'; // Hide previous error

  const { scenario1Id, scenario2Id } = getSelectedComparisonScenarios();
  const scenarios = getAllScenarios();

  const scenario1 = scenarios.find(s => s.id === scenario1Id);
  const scenario2 = scenarios.find(s => s.id === scenario2Id);

  if (!scenario1 || !scenario2) {
    $('#comparisonResults').style.display = 'none';
    return;
  }

  // Calculate metrics for both scenarios
  const metrics1 = calc(scenario1.data || scenario1.state); // Handle older scenario structure
  const metrics2 = calc(scenario2.data || scenario2.state); // Handle older scenario structure

  renderComparisonResults(metrics1, metrics2);
}

export function initDebugPanel() {
  const toggle = $('#debugToggle');
  const body = $('#debugBody');
  const pre = $('#debugPanel');
  if (!toggle || !body || !pre) return;

  // Update pre with calc() output and set a concise summary on the toggle
  function refreshDebug() {
    // Only refresh if debug panel is initialized and visible
    if (!pre || pre.style.display === 'none') return;

    try {
      const res = calc();
      pre.textContent = JSON.stringify(res, null, 2);
      toggle.textContent = '▶ Debug — clients: ' + (res.clients || 0) + ', revenue: ' + fmtMoney0(res.revenue || 0);
    } catch (e) {
      pre.textContent = 'Error generating debug: ' + (e && e.stack ? e.stack : String(e));
      toggle.textContent = '▶ Debug — error';
    }
  }

  // restore expanded state from localStorage
  const stored = localStorage.getItem('profitpath-debug-expanded');
  const expanded = stored === '1';
  if (expanded) {
    body.classList.remove('collapsed');
    body.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.textContent = toggle.textContent.replace(/^▶/, '▼');
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

export function refreshDebug() {
  // Only refresh if debug panel is initialized and visible
  if (!pre || pre.style.display === 'none') return;

  try {
    const res = calc();
    pre.textContent = JSON.stringify(res, null, 2);
    toggle.textContent = '▶ Debug — clients: ' + (res.clients || 0) + ', revenue: ' + fmtMoney0(res.revenue || 0);
  } catch (e) {
    pre.textContent = 'Error generating debug: ' + (e && e.stack ? e.stack : String(e));
    toggle.textContent = '▶ Debug — error';
  }
}

export function _preventTourScroll(e) {
  // allow certain inputs inside the tour dialog (handled by pointer events), but
  // generally prevent default touch/wheel scrolling while tour is active
  e.preventDefault();
}

export function _trapTourKeys(e) {
  // Prevent keyboard scrolling keys while tour active
  const blocked = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
  if (blocked.includes(e.key)) {
    e.preventDefault();
  }
}

export function lockScrollForTour() {
  if (_tourScrollLocked) return;
  _tourScrollLocked = true;
  try {
    _tourPrevHtmlOverflow = document.documentElement.style.overflow || '';
    _tourPrevBodyOverflow = document.body.style.overflow || '';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  } catch (e) {
    // ignore
  }
  document.addEventListener('touchmove', _preventTourScroll, { passive: false });
  document.addEventListener('wheel', _preventTourScroll, { passive: false });
  document.addEventListener('keydown', _trapTourKeys, { passive: false });
}

export function unlockScrollForTour() {
  if (!_tourScrollLocked) return;
  _tourScrollLocked = false;
  try {
    document.documentElement.style.overflow = _tourPrevHtmlOverflow || '';
    document.body.style.overflow = _tourPrevBodyOverflow || '';
  } catch (e) {
    // ignore
  }
  document.removeEventListener('touchmove', _preventTourScroll);
  document.removeEventListener('wheel', _preventTourScroll);
  document.removeEventListener('keydown', _trapTourKeys);
}

export function addOnboardingHelpButton() {
  // The help button is now in the HTML, just add event listeners
  const helpButton = document.getElementById('helpBtn');
  if (!helpButton) return;

  helpButton.addEventListener('click', showHelpMenu);
}

export function showWelcomeDialog() {
  const dialog = createOnboardingDialog({
    title: 'Welcome to ProfitPath! 🎉',
    content: '<div class="welcome-content"><p>Get started with your profitability analysis in just a few minutes.</p><p>Would you like a quick guided tour of the key features?</p></div><div style="display:flex;gap:10px;justify-content:center;"><button class="welcome-btn" data-action="tour" style="background:#007bff;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;">Take Tour</button><button class="welcome-btn" data-action="industry" style="background:#f8f9fa;color:#333;border:1px solid #dee2e6;padding:10px 20px;border-radius:6px;cursor:pointer;">Choose Industry</button><button class="welcome-btn" data-action="skip" style="background:transparent;color:#666;border:none;padding:10px 20px;cursor:pointer;">Skip for Now</button></div>',
    buttons: [] // We'll handle buttons manually
  });

  // Add event listeners after dialog is created
  setTimeout(() => {
    document.querySelectorAll('.welcome-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        dialog.remove(); // Close the dialog

        if (action === 'tour') {
          startGuidedTour();
        } else if (action === 'industry') {
          showIndustrySelector();
        }
        // Skip action just closes the dialog
      });
    });
  }, 100);

  document.body.appendChild(dialog);
}

export function showIndustrySelector() {
  const industries = [
    { id: 'consulting', name: 'Consulting', icon: '💼', description: 'Professional services, advisory, strategy' },
    { id: 'cleaning', name: 'Cleaning Services', icon: '🧽', description: 'Residential and commercial cleaning' },
    { id: 'landscaping', name: 'Landscaping', icon: '🌿', description: 'Garden maintenance, lawn care' },
    { id: 'fitness', name: 'Fitness & Wellness', icon: '🏋️', description: 'Personal training, gym services' },
    { id: 'photography', name: 'Photography', icon: '📷', description: 'Event, portrait, commercial photography' },
    { id: 'other', name: 'Other Service Business', icon: '🏭', description: 'Custom service business setup' }
  ];

  const industryGrid = industries.map(industry => '<div class="industry-option" data-industry="' + industry.id + '">' +
    '<div class="industry-icon" style="font-size:32px;margin-bottom:8px;">' + industry.icon + '</div>' +
    '<div class="industry-name">' + industry.name + '</div>' +
    '<div class="industry-desc">' + industry.description + '</div>' +
    '</div>'
  ).join('');

  const dialog = createOnboardingDialog({
    title: 'What type of service business do you run?',
    content: '<div class="industry-grid">' + industryGrid + '</div><p style="margin-top:16px;color:var(--muted);">This helps us provide tailored guidance and templates.</p>',
    buttons: [
      { text: 'Continue', action: () => { }, primary: true },
      { text: 'Skip', action: () => { } }
    ]
  });

  // Add click handlers for industry options
  setTimeout(() => {
    document.querySelectorAll('.industry-option').forEach(option => {
      option.addEventListener('click', () => {
        const industryId = option.dataset.industry;
        selectIndustry(industryId, dialog);
      });
    });
  }, 100);

  document.body.appendChild(dialog);
}

export function selectIndustry(industryId, dialog) {
  // Save selected industry
  localStorage.setItem('selectedIndustry', industryId);

  // Load industry-specific template
  loadOnboardingIndustryTemplate(industryId);

  // Close dialog and show success message
  dialog.remove();

  const successDialog = createOnboardingDialog({
    title: 'Great choice! 🎯',
    content: '<div class="success-content"><p>We\'ve loaded a template configuration for your industry.</p><p>Would you like to take a quick tour to learn how to customize it?</p></div><div style="display:flex;gap:10px;justify-content:center;"><button class="success-btn" data-action="tour" style="background:#007bff;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;">Show Me How</button><button class="success-btn" data-action="explore" style="background:#f8f9fa;color:#333;border:1px solid #dee2e6;padding:10px 20px;border-radius:6px;cursor:pointer;">Explore on My Own</button></div>',
    buttons: [] // We'll handle buttons manually
  });

  // Add event listeners after dialog is created
  setTimeout(() => {
    document.querySelectorAll('.success-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        successDialog.remove(); // Close the dialog

        if (action === 'tour') {
          startGuidedTour();
        }
        // Explore action just closes the dialog
      });
    });
  }, 100);

  document.body.appendChild(successDialog);
}

export function loadOnboardingIndustryTemplate(industryId) {
  const templates = {
    consulting: {
      offerings: [{
        name: 'Strategy Consulting',
        priceMonthly: 5000,
        sessionsPerYear: 12,
        hoursPerSession: 8,
        variableCostPerSession: 200
      }]
    },
    cleaning: {
      offerings: [{
        name: 'Standard Cleaning',
        priceMonthly: 150,
        sessionsPerYear: 4,
        hoursPerSession: 2,
        variableCostPerSession: 15
      }]
    },
    landscaping: {
      offerings: [{
        name: 'Weekly Lawn Care',
        priceMonthly: 200,
        sessionsPerYear: 52,
        hoursPerSession: 1,
        variableCostPerSession: 25
      }]
    },
    fitness: {
      offerings: [{
        name: 'Personal Training',
        priceMonthly: 300,
        sessionsPerYear: 48,
        hoursPerSession: 1,
        variableCostPerSession: 0
      }]
    },
    photography: {
      offerings: [{
        name: 'Wedding Photography',
        priceMonthly: 2500,
        sessionsPerYear: 6,
        hoursPerSession: 8,
        variableCostPerSession: 100
      }]
    }
  };

  const template = templates[industryId];
  if (template) {
    // Apply template to current scenario
    if (template.offerings) {
      state.offerings = template.offerings.map(o => ({
        ...o,
        id: uuid(),
        mixPct: 100 / template.offerings.length,
        currentClients: 0
      }));
    }

    // Refresh the UI
    render();
    persistState();
  }
}

export function startGuidedTour() {
  // Lock scrolling while the guided tour is active so users can't interrupt
  // the tour by manually scrolling. Programmatic scrolling (scrollIntoView)
  // is still allowed.
  lockScrollForTour();
  const tour = createGuidedTour();
  tour.start();
}

export function createGuidedTour() {
  const isMobile = window.innerWidth < 768;
  tourSteps = [
    {
      target: '.logo',
      title: 'Welcome to ProfitPath',
      content: 'This is your profitability dashboard. Let\'s take a quick tour of the key areas.',
      position: 'bottom'
    },
    {
      target: '.inputs-fields .field:first-child',
      title: 'Choose Your Mode',
      content: 'Select \'Forecast\' mode to plan capacity for a target client count. Use \'Current\' mode to analyze your active existing client base.',
      position: 'right'
    },
    {
      target: '.team-config-group',
      title: 'Team Configuration',
      content: 'Enter your team size and compensation details. The calculator assumes 2080 paid hours per year per employee.',
      position: 'right'
    },
    {
      target: '.offerings-section .section-h',
      title: 'Define Your Services',
      content: 'Add your service offerings with pricing, frequency, and costs. Each offering can have different terms.',
      position: 'right'
    },
    {
      target: 'aside.card .card-h',
      title: 'Key Profitability Metric',
      content: 'This shows your net income after all expenses. Green indicates profitability, red indicates losses.',
      position: 'top'
    },
    {
      target: 'aside.card .capacity',
      title: 'Capacity Utilization',
      content: 'Monitor how busy your team is. Aim for 80-90% utilization to balance profitability and client service.',
      position: 'left'
    },
    {
      target: '.break-even-section-wrapper',
      title: 'Break-even Analysis',
      content: 'See how many clients you need to break even with a detailed break-even analysis.',
      position: 'left'
    },
    {
      target: '.charts-visualizations-container',
      title: 'Charts & Visualizations',
      content: 'Explore interactive charts and graphs that help visualize your business metrics and financial analysis.',
      position: 'top'
    },
    {
      target: isMobile ? '#hamburgerBtn' : '.header-actions',
      title: 'Save, Export & Share',
      content: isMobile ? 'Access all saving, exporting, and sharing tools from the menu.' : 'Save scenarios for comparison, generate professional reports, or share your analysis with stakeholders.',
      position: 'bottom'
    }
  ];

  tourActive = true;

  return {
    start: () => showTourStep(0)
  };
}

export async function showTourStep(stepIndex) {
  if (!tourActive || stepIndex >= tourSteps.length) {
    completeTour();
    return;
  }

  const step = tourSteps[stepIndex];
  let target = document.querySelector(step.target);

  // Try fallback selectors if primary target not found
  if (!target) {
    const fallbacks = {
      '.header': '.container',
      '.offering-item': '.card',
      '.metrics-section': '.card',
      '#scenariosBtn': '.btn',
      '#shareBtn': '.btn'
    };
    target = document.querySelector(fallbacks[step.target] || step.target);
  }

  if (!target) {
    console.warn('Tour step ' + stepIndex + ' target not found: ' + step.target + ', skipping...');
    showTourStep(stepIndex + 1);
    return;
  }

  // Scroll the target element into view smoothly, then wait for scrolling to stop
  target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

  // Wait until scrolling has settled and the target is roughly centered before creating the tooltip.
  // This avoids creating the overlay while the page is still animating which caused the overlay
  // to be slightly offset when long smooth-scrolls were required.
  await waitForTargetSettled(target, { timeoutMs: 3000, idleMs: 250 });

  // Remove any leftover tooltips/overlays to avoid duplicates or jumping.
  document.querySelectorAll('.onboarding-tooltip, .onboarding-overlay').forEach(el => el.remove());

  // Now create the tooltip (createTooltip will append it to the DOM)
  const tooltip = createTooltip(step, target, null, stepIndex, tourSteps);

  // Add keyboard support
  const handleKeydown = (e) => {
    if (e.key === 'Escape' && tourActive) {
      document.removeEventListener('keydown', handleKeydown);
      exitTour();
    }
  };
  document.addEventListener('keydown', handleKeydown);

  // Store cleanup function
  tooltip._cleanupKeyboard = () => {
    document.removeEventListener('keydown', handleKeydown);
  };
}

export function waitForTargetSettled(target, { timeoutMs = 3000, idleMs = 250, stableMs = 250 } = {}) {
  return new Promise((resolve) => {
    let idleTimer = null;
    let timeoutTimer = null;
    let rafId = null;

    function cleanup() {
      if (idleTimer) clearTimeout(idleTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll, { passive: true });
      window.removeEventListener('resize', onScroll);
    }

    // After we observe no scroll for idleMs, ensure the element's rect is stable
    // for stableMs milliseconds before resolving. If the element is not near
    // the center, perform an immediate snap and continue waiting for stability.
    function ensureStableAndResolve() {
      const startTime = Date.now();
      let lastRect = target.getBoundingClientRect();
      let lastChange = Date.now();

      // If target is far from center, snap it into view first (instant)
      const rectNow = lastRect;
      const viewportCenterY = window.innerHeight / 2;
      const deltaCenter = Math.abs((rectNow.top + rectNow.bottom) / 2 - viewportCenterY);
      if (deltaCenter > window.innerHeight * 0.2) {
        try {
          target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
        } catch (e) {
          // ignore
        }
        // update lastRect after snapping
        lastRect = target.getBoundingClientRect();
        lastChange = Date.now();
      }

      function checkRect() {
        const rect = target.getBoundingClientRect();
        const dx = Math.abs(rect.top - lastRect.top) + Math.abs(rect.left - lastRect.left) + Math.abs(rect.width - lastRect.width) + Math.abs(rect.height - lastRect.height);
        if (dx > 2) {
          lastRect = rect;
          lastChange = Date.now();
        }

        if (Date.now() - lastChange >= stableMs) {
          cleanup();
          resolve();
          return;
        }

        if (Date.now() - startTime >= timeoutMs) {
          cleanup();
          resolve();
          return;
        }

        rafId = requestAnimationFrame(checkRect);
      }

      checkRect();
    }

    function onScroll() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        ensureStableAndResolve();
      }, idleMs);
    }

    // Start listeners and safety timeout
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    timeoutTimer = setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs + 200);

    // Kick off initial idle check (in case no scroll events occur)
    onScroll();
  });
}

export function ensureStableAndResolve() {
  const startTime = Date.now();
  let lastRect = target.getBoundingClientRect();
  let lastChange = Date.now();

  // If target is far from center, snap it into view first (instant)
  const rectNow = lastRect;
  const viewportCenterY = window.innerHeight / 2;
  const deltaCenter = Math.abs((rectNow.top + rectNow.bottom) / 2 - viewportCenterY);
  if (deltaCenter > window.innerHeight * 0.2) {
    try {
      target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
    } catch (e) {
      // ignore
    }
    // update lastRect after snapping
    lastRect = target.getBoundingClientRect();
    lastChange = Date.now();
  }

  function checkRect() {
    const rect = target.getBoundingClientRect();
    const dx = Math.abs(rect.top - lastRect.top) + Math.abs(rect.left - lastRect.left) + Math.abs(rect.width - lastRect.width) + Math.abs(rect.height - lastRect.height);
    if (dx > 2) {
      lastRect = rect;
      lastChange = Date.now();
    }

    if (Date.now() - lastChange >= stableMs) {
      cleanup();
      resolve();
      return;
    }

    if (Date.now() - startTime >= timeoutMs) {
      cleanup();
      resolve();
      return;
    }

    rafId = requestAnimationFrame(checkRect);
  }

  checkRect();
}

export function checkRect() {
  const rect = target.getBoundingClientRect();
  const dx = Math.abs(rect.top - lastRect.top) + Math.abs(rect.left - lastRect.left) + Math.abs(rect.width - lastRect.width) + Math.abs(rect.height - lastRect.height);
  if (dx > 2) {
    lastRect = rect;
    lastChange = Date.now();
  }

  if (Date.now() - lastChange >= stableMs) {
    cleanup();
    resolve();
    return;
  }

  if (Date.now() - startTime >= timeoutMs) {
    cleanup();
    resolve();
    return;
  }

  rafId = requestAnimationFrame(checkRect);
}

export function onScroll() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    ensureStableAndResolve();
  }, idleMs);
}

export function exitTour() {
  tourActive = false;
  // Remove all tooltips and overlays
  // Unlock scrolling when the tour exits
  unlockScrollForTour();
  document.querySelectorAll('.onboarding-tooltip, .onboarding-overlay').forEach(el => el.remove());

  // Show exit confirmation
  const exitDialog = createOnboardingDialog({
    title: 'Tour Exited',
    content: '<p>You can resume the guided tour anytime by clicking the ❓ help button in the top-right corner.</p><p>Feel free to explore the features at your own pace!</p>',
    buttons: [
      { text: 'Got it!', action: () => { } }
    ]
  });

  document.body.appendChild(exitDialog);
}

export function completeTour() {
  tourActive = false;
  // Unlock scrolling when the tour completes
  unlockScrollForTour();
  localStorage.setItem('onboardingCompleted', 'true');

  const completionDialog = createOnboardingDialog({
    title: 'Tour Complete! 🎉',
    content: '<p>You now know the basics of ProfitPath!</p><p>Explore the features at your own pace. Use the ❓ help button anytime for guidance.</p>',
    buttons: [
      { text: 'Got it!', action: () => { }, primary: true }
    ]
  });

  document.body.appendChild(completionDialog);
}

export function createTooltip(step, target, onNext, stepIndex, steps) {
  const isMobile = window.innerWidth < 768;

  // Get fresh bounding rect after scrolling completes
  const rect = target.getBoundingClientRect();

  // Calculate final position first
  let left, top, transform;

  if (isMobile) {
    // On mobile, always position below the element for better visibility
    left = Math.max(10, Math.min(window.innerWidth - 290, rect.left + rect.width / 2 - 140));
    top = rect.bottom + 10;
    transform = 'translate(0, 0)';
  } else {
    switch (step.position) {
      case 'top':
        left = rect.left + rect.width / 2;
        top = rect.top - 10;
        transform = 'translate(-50%, -100%)';
        break;
      case 'bottom':
        left = rect.left + rect.width / 2;
        top = rect.bottom + 10;
        transform = 'translate(-50%, 0)';
        break;
      case 'left':
        left = rect.left - 10;
        top = rect.top + rect.height / 2;
        transform = 'translate(-100%, -50%)';
        break;
      case 'right':
        left = rect.right + 10;
        top = rect.top + rect.height / 2;
        transform = 'translate(0, -50%)';
        break;
      default:
        left = rect.left + rect.width / 2;
        top = rect.bottom + 10;
        transform = 'translate(-50%, 0)';
    }
  }

  // Ensure tooltip stays within viewport bounds
  const tooltipWidth = isMobile ? 280 : 300;
  const tooltipHeight = 200; // Approximate height with navigation

  if (left < 10) {
    left = 10;
  }
  if (left + tooltipWidth > window.innerWidth - 10) {
    left = window.innerWidth - tooltipWidth - 10;
  }
  if (top - tooltipHeight < 10) {
    top = tooltipHeight + 10;
    if (!isMobile) transform = transform.replace('-100%', '0');
  }
  if (top + tooltipHeight > window.innerHeight - 10) {
    top = window.innerHeight - tooltipHeight - 10;
    if (!isMobile) transform = transform.replace('0', '-100%');
  }

  // Create tooltip with final position-no intermediate rendering
  const tooltip = document.createElement('div');
  tooltip.className = 'onboarding-tooltip';
  tooltip.style.cssText = 'position: fixed;z-index: 10000;background: white;border: 2px solid #007bff;border-radius: 8px;padding: 16px;box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);max-width: ' + (isMobile ? '280px' : '300px') + ';pointer-events: auto;font-size: ' + (isMobile ? '14px' : '16px') + ';left: ' + left + 'px;top: ' + top + 'px;transform: ' + transform + ';opacity: 0;transition: opacity 0.3s ease-out;';

  // Append to DOM and fade in from final position
  document.body.appendChild(tooltip);
  requestAnimationFrame(() => {
    tooltip.style.opacity = '1';
  });

  // Create progress dots
  const progressDots = steps.map((_, index) => '<span class="tour-dot ' + (index === stepIndex ? 'active' : '') + ' ' + (index < stepIndex ? 'completed' : '') + '" data-step="' + index + '" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 2px;cursor:pointer;background:' + (index === stepIndex ? '#007bff' : index < stepIndex ? '#28a745' : '#ddd') + ';transition:all 0.2s;"></span>').join('');

  tooltip.innerHTML = '<div style="position:relative;padding-right:24px;"><button class="tour-exit-btn" style="position:absolute;top:0;right:0;background:transparent;border:none;font-size:16px;cursor:pointer;color:var(--text, #666);padding:4px;line-height:1;">✕</button><div style="font-weight:bold;margin-bottom:8px;color:var(--text, #007bff);">' + step.title + '</div><div style="margin-bottom:16px;color:var(--text, #333);line-height:1.4;">' + step.content + '</div><div style="display:flex;align-items:center;justify-content:center;margin-bottom:12px;position:relative;"><div class="tour-navigation" style="display:flex;align-items:center;">' + (stepIndex > 0 ? '<button class="tour-arrow tour-arrow-prev" data-direction="prev" style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-right:8px;font-size:18px;line-height:1;">‹</button>' : '<div style="width:32px;"></div>') + '<div class="tour-dots" style="display:flex;align-items:center;">' + progressDots + '</div>' + (stepIndex < steps.length - 1 ? '<button class="tour-arrow tour-arrow-next" data-direction="next" style="background:#007bff;color:white;border:none;border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-left:8px;font-size:18px;line-height:1;">›</button>' : '<button class="tour-finish-btn" style="background:#28a745;color:white;border:none;border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-left:8px;font-size:16px;line-height:1;">✓</button>') + '</div></div></div>';

  // Add event listeners for navigation
  setTimeout(() => {
    // Exit button
    const exitBtn = tooltip.querySelector('.tour-exit-btn');
    if (exitBtn) {
      exitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        exitTour();
      });
    }

    // Navigation buttons
    const prevBtn = tooltip.querySelector('.tour-arrow-prev');
    const nextBtn = tooltip.querySelector('.tour-arrow-next');
    const finishBtn = tooltip.querySelector('.tour-finish-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        tooltip.remove();
        if (stepIndex > 0) {
          showTourStep(stepIndex - 1);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        tooltip.remove();
        if (stepIndex < steps.length - 1) {
          showTourStep(stepIndex + 1);
        }
      });
    }

    if (finishBtn) {
      finishBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        tooltip.remove();
        completeTour();
      });
    }

    // Progress dots
    const dots = tooltip.querySelectorAll('.tour-dot');
    dots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetStep = parseInt(e.currentTarget.dataset.step);
        tooltip.remove();
        showTourStep(targetStep);
      });
    });
  }, 50);

  // Add event listener for the button
  setTimeout(() => {
    const nextBtn = tooltip.querySelector('.tooltip-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        tooltip.remove();
        if (onNext) onNext();
      });
    }
  }, 10);

  // Highlighting: place a fixed overlay around the target so we don't rely on modifying
  // the target's own styles (avoids stacking-context/overflow issues and layout shifts).
  const OVERLAY_PAD = 9; // pixels to expand the highlight beyond the element (increased by 1 to keep outer perimeter)
  const BORDER_THICKNESS = 7; // highlight border thickness (reduced by 1px for less clipping)

  const rect2 = target.getBoundingClientRect();
  const computed = window.getComputedStyle(target);
  // If the target has no rounded corners, use a mild default so highlights look rounded
  const parsedBR = parseFloat(computed.borderRadius) || 0;
  const borderRadius = (parsedBR && parsedBR > 4) ? parsedBR + 'px' : '10px';

  const overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';
  overlay.style.cssText = 'position: fixed;left: ' + (rect2.left - OVERLAY_PAD) + 'px;top: ' + (rect2.top - OVERLAY_PAD) + 'px;width: ' + (rect2.width + OVERLAY_PAD * 2) + 'px;height: ' + (rect2.height + OVERLAY_PAD * 2) + 'px;border: ' + BORDER_THICKNESS + 'px solid #007bff;border-radius: ' + borderRadius + ';box-shadow: 0 8px 32px rgba(0, 123, 255, 0.12);pointer-events: none;z-index: 9999;animation: pulse 2s infinite;';

  // Append overlay underneath the tooltip (tooltip uses z-index:10000)
  document.body.appendChild(overlay);

  // Store overlay for cleanup
  tooltip._overlay = overlay;

  // Wrap original remove to also remove the overlay and keyboard handler
  const originalRemove = tooltip.remove;
  tooltip.remove = function () {
    try {
      if (tooltip._overlay && tooltip._overlay.parentNode) tooltip._overlay.parentNode.removeChild(tooltip._overlay);
    } catch (e) {
      // ignore
    }
    if (tooltip._cleanupKeyboard) {
      tooltip._cleanupKeyboard();
    }
    originalRemove.call(this);
  };

  return tooltip;
}

export function createOnboardingDialog({ title, content, buttons }) {
  const dialog = document.createElement('div');
  dialog.className = 'onboarding-dialog-overlay';
  dialog.style.cssText = 'position: fixed;top: 0;left: 0;right: 0;bottom: 0;background: rgba(0, 0, 0, 0.6);display: flex;align-items: center;justify-content: center;z-index: 10001;';

  const dialogContent = document.createElement('div');
  dialogContent.style.cssText = 'background: white;border-radius: 12px;padding: 24px;max-width: 500px;width: 90%;box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);';

  dialogContent.innerHTML = '<h2 style="margin:0 0 16px 0;color:var(--text, #333);font-size:24px;">' + title + '</h2><div style="color:var(--text, #666);line-height:1.5;">' + content + '</div><div style="margin-top:24px;text-align:right;display:flex;gap:8px;justify-content:flex-end;">' + buttons.map((btn, index) => '<button class="dialog-btn" data-action="' + index + '" data-primary="' + (btn.primary ? 'true' : 'false') + '" style="padding:8px 16px;border:' + (btn.primary ? 'none' : '1px solid #ddd') + ';border-radius:6px;background:' + (btn.primary ? '#007bff' : 'white') + ';color:' + (btn.primary ? 'white' : '#333') + ';cursor:pointer;font-weight:' + (btn.primary ? 'bold' : 'normal') + ';">' + btn.text + '</button>').join('') + '</div>';

  // Add event listeners for dialog buttons
  setTimeout(() => {
    const dialogBtns = dialogContent.querySelectorAll('.dialog-btn');
    dialogBtns.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const action = buttons[index]?.action;
        dialog.remove();
        if (action && typeof action === 'function') {
          action();
        }
      });
    });
  }, 10);

  dialog.appendChild(dialogContent);
  return dialog;
}

export function showHelpMenu() {
  const helpDialog = createOnboardingDialog({
    title: 'Help & Learning Center',
    content: '<div style="display:grid;gap:12px;"><button class="help-menu-btn" data-action="tour" style="display:block;width:100%;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;text-align:left;cursor:pointer;">🎯 <strong>Take Guided Tour</strong><br><small>Step-by-step walkthrough of key features</small></button><button class="help-menu-btn" data-action="industry" style="display:block;width:100%;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;text-align:left;cursor:pointer;">🏢 <strong>Change Industry</strong><br><small>Switch to a different business template</small></button><button class="help-menu-btn" data-action="tooltips" style="display:block;width:100%;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:6px;text-align:left;cursor:pointer;">💡 <strong>Show Tooltips</strong><br><small>Enable contextual help throughout the app</small></button></div>',
    buttons: [
      { text: 'Close', action: () => { } }
    ]
  });

  // Add event listeners after dialog is created
  setTimeout(() => {
    document.querySelectorAll('.help-menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        helpDialog.remove(); // Close the dialog

        setTimeout(() => {
          if (action === 'tour') {
            startGuidedTour();
          } else if (action === 'industry') {
            showIndustrySelector();
          } else if (action === 'tooltips') {
            showContextualHelp();
          }
        }, 100);
      });
    });
  }, 100);

  document.body.appendChild(helpDialog);
}

export function initializeContextualTooltips() {
  // Add tooltips to key elements
  const tooltipElements = [
    { selector: '#employees', content: 'Set the number of full-time employees in your business' },
    { selector: '#employeePay', content: 'Average annual salary per employee including benefits' },
    { selector: '.offering-card .btn.danger', content: 'Remove this service offering from your business model' },
    { selector: '#scenariosBtn', content: 'Save current configuration or load previous scenarios' },
    { selector: '#shareBtn', content: 'Generate shareable link for stakeholders' },
    { selector: '.settings-cog-btn', content: 'Customize experience level and advanced features' }
  ];

  tooltipElements.forEach(({ selector, content }) => {
    const element = document.querySelector(selector);
    if (element) {
      element.title = content; // Basic tooltip
    }
  });
}

export function showContextualHelp() {
  // Enable enhanced tooltips
  const tooltipElements = document.querySelectorAll('[title]');
  tooltipElements.forEach(el => {
    if (!el.dataset.tooltipEnabled) {
      el.dataset.originalTitle = el.title;
      el.dataset.tooltipEnabled = 'true';
      el.title = ''; // Remove basic tooltip

      el.addEventListener('mouseenter', showEnhancedTooltip);
      el.addEventListener('mouseleave', hideEnhancedTooltip);
    }
  });

  // Update settings to reflect tooltips are enabled
  if (updateSetting) {
    updateSetting('showTooltips', true);
  }

  // Show confirmation
  const notification = document.createElement('div');
  notification.textContent = 'Contextual tooltips enabled! Hover over elements to see help.';
  notification.style.cssText = 'position: fixed;top: 20px;left: 50%;transform: translateX(-50%);background: var(--accent, #007bff);color: white;padding: 10px 20px;border-radius: 6px;z-index: 10002;font-size: 14px;';
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

export function showEnhancedTooltip(e) {
  const content = e.target.dataset.originalTitle;
  if (!content) return;

  const tooltip = document.createElement('div');
  tooltip.className = 'enhanced-tooltip';
  tooltip.textContent = content;
  tooltip.style.cssText = 'position: fixed;background: #333;color: white;padding: 8px 12px;border-radius: 4px;font-size: 12px;z-index: 10002;pointer-events: none;max-width: 200px;word-wrap: break-word;';

  document.body.appendChild(tooltip);

  const rect = e.target.getBoundingClientRect();
  tooltip.style.left = (rect.left + rect.width / 2) + 'px';
  tooltip.style.top = (rect.top - 8) + 'px';
  tooltip.style.transform = 'translate(-50%, -100%)';

  e.target._tooltip = tooltip;
}

export function hideEnhancedTooltip(e) {
  if (e.target._tooltip) {
    e.target._tooltip.remove();
    delete e.target._tooltip;
  }
}
