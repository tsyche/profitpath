// The main render function extracted from backup
export function render() {
    const focus = captureTableFocus();

    let metrics;
    try {
      metrics = calc();
    } catch (e) {
      console.error('Calculation failed in render:', e);
      // Return early with error state
      const dbg = $('#debugPanel');
      if (dbg) {
        dbg.textContent = 'Calculation error: ' + (e && e.stack ? e.stack : String(e));
        dbg.style.display = 'block';
      }
      return;
    }

    // Top-level inputs
    $('#modeSelect').value = state.mode;
    $('#employees').value = state.employees;
    $('#employeePay').value = state.employeePay;
    $('#monthlyCosts').value = state.monthlyCosts;
    $('#productiveUtilizationPct').value = state.productiveUtilizationPct;

    const isForecast = state.mode === 'forecast';
    $('#targetUtilizationPct').closest('.field').classList.toggle('hidden', !isForecast);
    $('#targetUtilizationPct').value = state.targetUtilizationPct;

    $('#lockMixField')?.classList.toggle('hidden', !isForecast);
    const lockMixEl = $('#lockMix');
    if (lockMixEl) lockMixEl.checked = Boolean(state.lockMix);

    // Style hint: highlight which table column is editable in the current mode.
    $('#offeringsTable')?.classList.toggle('mode-forecast', isForecast);
    $('#offeringsTable')?.classList.toggle('mode-current', !isForecast);

    // Offerings table
    const tbody = $('#offeringsBody');
    tbody.innerHTML = '';

    metrics.offerings.forEach((o, idx) => {
      const tr = document.createElement('tr');

      const mixCell = isForecast
        ? '<input aria-label="Mix % for ' + (escapeHtml(o.name)) + '" class="mode-edit" type="number" min="0" max="100" step="1" value="' + ((o.mixPct ?? 0).toFixed(1)) + '" data-k="mixPct" data-i="' + (idx) + '" />'
        : '<span class="muted">—</span>';

      const clientsCell = isForecast
        ? '<span class="muted">—</span>'
        : '<input aria-label="Clients for ' + (escapeHtml(o.name)) + '" class="mode-edit" type="number" min="0" step="1" value="' + (o.currentClients ?? 0) + '" data-k="currentClients" data-i="' + (idx) + '" />';

      const estClients = isForecast
        ? Math.floor(metrics.clients * ((o.mixPct || 0) / 100))
        : o.currentClients;

      const estSessions = isForecast
        ? Math.round(estClients * o.sessionsPerYear)
        : Math.round((o.currentClients || 0) * o.sessionsPerYear);

      tr.innerHTML = '<td class="cell-edit group-start group-inputs" data-label="Offering"><input aria-label="Offering name" type="text" value="' + (escapeHtml(o.name)) + '" data-k="name" data-i="' + (idx) + '"/></td>' +
        '<td class="cell-edit group-inputs" data-label="Price / mo"><input aria-label="Price per month for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="10" value="' + (o.priceMonthly) + '" data-k="priceMonthly" data-i="' + (idx) + '"/></td>' +
        '<td class="cell-edit group-inputs" data-label="Sessions / yr"><input aria-label="Sessions per year for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="1" value="' + (o.sessionsPerYear) + '" data-k="sessionsPerYear" data-i="' + (idx) + '"/></td>' +
        '<td class="cell-edit group-inputs" data-label="Hours / session"><input aria-label="Hours per session for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="0.1" value="' + (o.hoursPerSession) + '" data-k="hoursPerSession" data-i="' + (idx) + '"/></td>' +
        '<td class="cell-edit group-inputs group-end" data-label="Var $ / session"><input aria-label="Variable cost per session for ' + (escapeHtml(o.name)) + '" type="number" min="0" step="1" value="' + (o.variableCostPerSession) + '" data-k="variableCostPerSession" data-i="' + (idx) + '"/></td>' +
        '<td class="cell-edit group-start group-mode" data-label="Mix % (forecast)">' + (mixCell) + '</td>' +
        '<td class="cell-edit group-mode group-end" data-label="Clients (current)">' + (clientsCell) + '</td>' +
        '<td class="cell-readonly group-start group-est" data-label="Est. clients"><span class="mono">' + (fmtInt(estClients)) + '</span></td>' +
        '<td class="cell-readonly group-est" data-label="Est. sessions"><span class="mono">' + (fmtInt(estSessions)) + '</span></td>' +
        '<td class="cell-readonly group-metrics" data-label="Annual Revenue"><span class="mono">' + (fmtMoney0(metrics.offeringMetrics[idx]?.revenue || 0)) + '</span></td>' +
        '<td class="cell-readonly group-metrics" data-label="Margin %"><span class="mono" style="color:' + ((metrics.offeringMetrics[idx]?.marginPct || 0) > 0 ? 'var(--good)' : 'var(--bad)') + '">' + (fmtPct1(metrics.offeringMetrics[idx]?.marginPct || 0)) + '</span></td>' +
        '<td class="cell-readonly group-metrics group-end" data-label="Annual Profit"><span class="mono" style="color:' + ((metrics.offeringMetrics[idx]?.profit || 0) > 0 ? 'var(--good)' : 'var(--bad)') + '">' + (fmtMoney0(metrics.offeringMetrics[idx]?.profit || 0)) + '</span></td>' +
        '<td class="cell-edit group-actions" data-label="Actions"><button class="btn small danger" data-action="removeOffering" data-i="' + (idx) + '" aria-label="Remove ' + (escapeHtml(o.name)) + '">Remove</button></td>';

      tbody.appendChild(tr);
    });

    restoreTableFocus(focus);

    // Mix/mode note (used as the "what am I editing" banner, especially on small screens).
    const mixNote = $('#mixNote');
    mixNote.classList.remove('note-forecast', 'note-current', 'note-warn', 'note-lock');

    if (isForecast) {
      const sum = metrics.offerings.reduce((a, o) => a + (Number(o.mixPct) || 0), 0);
      const delta = Math.abs(sum - 100);

      mixNote.classList.add('note-forecast');
      if (state.lockMix) mixNote.classList.add('note-lock');
      if (!state.lockMix && delta >= 0.05) mixNote.classList.add('note-warn');

      mixNote.textContent = state.lockMix
        ? 'Forecast mode: editing Mix % (locked to 100%, auto-balancing others)'
        : (delta < 0.05
          ? 'Forecast mode: editing Mix % (current total ' + (sum.toFixed(1)) + '%)'
          : 'Forecast mode: editing Mix % (current total ' + (sum.toFixed(1)) + '% — auto-normalized for calculations)');
    } else {
      const total = metrics.offerings.reduce((a, o) => a + (Number(o.currentClients) || 0), 0);
      mixNote.classList.add('note-current');
      mixNote.textContent = total > 0
        ? 'Current mode: editing Clients (utilization computed from workload)'
        : 'Current mode: start by entering Clients';
    }

    // KPIs
    updateOutputs(metrics);

    // Update validation messages
    updateValidationDisplay();
  }
