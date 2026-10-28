const STORAGE_KEY = 'profitpath-output-tab';
type TabName = 'analyze' | 'customers' | 'overview';

const tabs = {
  analyze: { button: 'analysisAnalyzeTab', panel: 'analysisAnalyzePanel' },
  customers: { button: 'analysisCustomersTab', panel: 'analysisCustomersPanel' }
} as const;

function isAvailable(name: Exclude<TabName, 'overview'>) {
  const panel = document.getElementById(tabs[name].panel);
  return Boolean(panel?.querySelector<HTMLElement>('.advanced-feature, .expert-feature') &&
    [...panel.querySelectorAll<HTMLElement>('.advanced-feature, .expert-feature')].some((child) => getComputedStyle(child).display !== 'none'));
}

function readSelected(): TabName {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'analyze' || saved === 'customers' ? saved : 'overview';
  } catch {
    return 'overview';
  }
}

function saveSelected(name: TabName) {
  try { localStorage.setItem(STORAGE_KEY, name); } catch { /* storage is optional */ }
}

function applyTab(name: TabName, focusPanel = false) {
  const available = (Object.keys(tabs) as Exclude<TabName, 'overview'>[]).filter(isAvailable);
  const selected = available.includes(name as Exclude<TabName, 'overview'>) ? name : 'overview';
  const tabList = document.getElementById('analysisTabs');
  if (!tabList) return;
  tabList.hidden = available.length === 0;

  for (const [tabName, ids] of Object.entries(tabs) as [Exclude<TabName, 'overview'>, typeof tabs.analyze][]) {
    const active = tabName === selected;
    const button = document.getElementById(ids.button) as HTMLButtonElement | null;
    const panel = document.getElementById(ids.panel);
    if (button) {
      button.hidden = !available.includes(tabName);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    }
    if (panel) panel.hidden = !active;
  }
  saveSelected(selected);
  if (focusPanel && selected !== 'overview') document.getElementById(tabs[selected].panel)?.focus();
}

export function initAnalysisTabs() {
  const tabList = document.getElementById('analysisTabs');
  if (!tabList) return;

  tabList.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[role="tab"]');
    if (!button) return;
    applyTab(button.id === tabs.customers.button ? 'customers' : 'analyze', true);
  });
  tabList.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const available = (Object.keys(tabs) as Exclude<TabName, 'overview'>[]).filter(isAvailable);
    if (!available.length) return;
    event.preventDefault();
    const current = available.findIndex((name) => document.activeElement?.id === tabs[name].button);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? available.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + available.length) % available.length;
    document.getElementById(tabs[available[next]].button)?.focus();
  });

  window.addEventListener('settingsChanged', () => setTimeout(() => applyTab(readSelected()), 60));
  applyTab(readSelected());
}

export function refreshAnalysisTabs() {
  applyTab(readSelected());
}
