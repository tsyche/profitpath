/** Lock financial controls with native semantics, including controls rebuilt during rendering. */
export function applyReadOnlyControls() {
  if (!document.body.classList.contains('pp-readonly')) return;
  const selector = '#controls input, #controls select, #controls textarea, #controls button, #membershipEditor input, #membershipEditor select, #membershipEditor button, #modeBadgeBtn, #undoBtn, #redoBtn';
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement | HTMLTextAreaElement>(selector).forEach(control => {
    control.dataset.readonlyWasDisabled ??= String(control.disabled);
    control.disabled = true;
  });
}

export function leaveReadOnlyMode() {
  document.body.classList.remove('pp-readonly');
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement | HTMLTextAreaElement>('[data-readonly-was-disabled]').forEach(control => {
    control.disabled = control.dataset.readonlyWasDisabled === 'true';
    delete control.dataset.readonlyWasDisabled;
  });
  const notes = document.getElementById('scenarioNotes');
  if (notes) notes.style.display = '';
  const display = document.getElementById('scenarioNotesDisplay');
  if (display) display.hidden = true;
  const url = new URL(location.href);
  url.searchParams.delete('readonly');
  history.replaceState(history.state, '', url.pathname + url.search + url.hash);
}
