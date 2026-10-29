import type { AppOffering, AppState, Offering } from '../../src/types';
import { INDUSTRY_TEMPLATES } from '../services/industryTemplates';
import { initializeProgressiveDisclosure } from '../utils/progressiveDisclosure';
import { showToast } from '../services/modalService';
import { uuid } from '../utils/helpers';
import { updateSetting } from '../services/miscService';
import { setTooltipsEnabled } from '../utils/tooltipManager';
import { createModal } from './Modal';
import { usesWorkspaces } from '../../src/ui/workspaceNavigation';
import { applyReadOnlyControls } from '../utils/readOnly';

/** Welcome dialog, industry picker, guided tour, help menu and contextual tooltips. */

interface OnboardingDeps {
  getState: () => AppState;
  render: () => void;
  persistState: () => void;
}

let deps: OnboardingDeps | null = null;

// Onboarding system for guided experience
const _initializeOnboarding = () => {
  // Check if user has completed onboarding
  const onboardingCompleted = localStorage.getItem('profitpath-onboarding-completed') === 'true';

  // Always show help button (users can access help anytime)
  addOnboardingHelpButton();

  // Show welcome message for new users who haven't completed onboarding
  if (!onboardingCompleted && !usesWorkspaces()) {
    setTimeout(() => {
      showWelcomeDialog();
    }, 1000);
  }

  // Initialize contextual tooltips
  initializeContextualTooltips();

  // Initialize enhanced tooltip system with current setting state
  try {
    const settings = JSON.parse(localStorage.getItem('profitpath-settings') || '{}');
    const tooltipsEnabled = settings.showTooltips !== false;
    updateTooltipsUIOnly(tooltipsEnabled);
  } catch {
    // Default to enabled if settings can't be read
    updateTooltipsUIOnly(true);
  }

  // Initialize progressive disclosure
  initializeProgressiveDisclosure();
};

/** Start onboarding once the DOM is ready. */
export function initOnboarding(d: OnboardingDeps): void {
  deps = d;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initializeOnboarding);
  } else {
    _initializeOnboarding();
  }
}

// Scroll lock helpers for guided tour
let _tourScrollLocked = false;
function _preventTourScroll(e: Event) {
  // allow certain inputs inside the tour dialog (handled by pointer events), but
  // generally prevent default touch/wheel scrolling while tour is active
  e.preventDefault();
}

function _trapTourKeys(e: KeyboardEvent) {
  // Prevent keyboard scrolling keys while tour active
  const blocked = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
  if (blocked.includes(e.key)) {
    e.preventDefault();
  }
}

function lockScrollForTour() {
  if (_tourScrollLocked) return;
  _tourScrollLocked = true;
  try {
    window.acquireScrollLock?.();
  } catch {
    // ignore
  }
  document.addEventListener('touchmove', _preventTourScroll, { passive: false });
  document.addEventListener('wheel', _preventTourScroll, { passive: false });
  document.addEventListener('keydown', _trapTourKeys, { passive: false });
}

function unlockScrollForTour() {
  if (!_tourScrollLocked) return;
  _tourScrollLocked = false;
  try {
    window.releaseScrollLock?.();
  } catch {
    // ignore
  }
  document.removeEventListener('touchmove', _preventTourScroll);
  document.removeEventListener('wheel', _preventTourScroll);
  document.removeEventListener('keydown', _trapTourKeys);
}

function addOnboardingHelpButton() {
  // The help button is now in the HTML, just add event listeners
  const helpButton = document.getElementById('helpBtn');
  if (!helpButton) return;

  helpButton.addEventListener('click', showHelpMenu);
}

export function enterReadOnlyMode(state: { notes?: string }): void {
  document.body.classList.add('pp-readonly');

  // Populate and show the banner
  const startLink = document.querySelector<HTMLAnchorElement>('.pp-readonly-start-link');
  if (startLink) startLink.href = window.location.origin + window.location.pathname;

  // Show notes in the read-only display block and hide the edit textarea
  const notesEdit = document.getElementById('scenarioNotes');
  const notesDisplay = document.getElementById('scenarioNotesDisplay');
  if (notesEdit) notesEdit.style.display = 'none';
  if (notesDisplay) {
    const text = (state.notes || '').trim();
    if (text) {
      notesDisplay.textContent = text;
      notesDisplay.hidden = false;
      notesDisplay.closest('.scenario-notes-wrap')?.classList.add('has-notes');
    }
  }

  // Disable undo/redo (state mutation no longer makes sense)
  const undoBtn = document.getElementById('undoBtn') as HTMLButtonElement | null;
  const redoBtn = document.getElementById('redoBtn') as HTMLButtonElement | null;
  if (undoBtn) undoBtn.disabled = true;
  if (redoBtn) redoBtn.disabled = true;
  applyReadOnlyControls();
}

function showWelcomeDialog() {
  const dialog = createOnboardingDialog({
    title: 'Welcome to ProfitPath! 🎉',
    content: '<div class="welcome-content"><p>Get started with your profitability analysis in just a few minutes.</p><p>Would you like a quick guided tour of the key features?</p></div><div style="display:flex;gap:10px;justify-content:center;"><button class="welcome-btn" data-action="tour" style="background:var(--accent);color:#06231a;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;">Take Tour</button><button class="welcome-btn" data-action="industry" style="background:var(--surface-2);color:var(--text);border:1px solid var(--border);padding:10px 20px;border-radius:6px;cursor:pointer;">Choose Industry</button><button class="welcome-btn" data-action="skip" style="background:transparent;color:var(--muted);border:none;padding:10px 20px;cursor:pointer;">Skip for Now</button></div>',
    buttons: [] // We'll handle buttons manually
  });

  // Add event listeners after dialog is created
  setTimeout(() => {
    document.querySelectorAll<HTMLElement>('.welcome-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action;
        dialog.remove(); // Close the dialog
        window.releaseScrollLock?.();

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

function showIndustrySelector() {
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
    document.querySelectorAll<HTMLElement>('.industry-option').forEach(option => {
      option.addEventListener('click', () => {
        const industryId = option.dataset.industry || '';
        selectIndustry(industryId, dialog);
      });
    });
  }, 100);

  document.body.appendChild(dialog);
}

function selectIndustry(industryId: string, dialog: HTMLElement) {
  // Save selected industry
  localStorage.setItem('profitpath-selected-industry', industryId);

  // Load industry-specific template
  loadOnboardingIndustryTemplate(industryId);

  // Close dialog and show success message
  dialog.remove();
  window.releaseScrollLock?.();

  const successDialog = createOnboardingDialog({
    title: 'Great choice! 🎯',
    content: '<div class="success-content"><p>We\'ve loaded a template configuration for your industry.</p><p>Would you like to take a quick tour to learn how to customize it?</p></div><div style="display:flex;gap:10px;justify-content:center;"><button class="success-btn" data-action="tour" style="background:var(--accent);color:#06231a;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;">Show Me How</button><button class="success-btn" data-action="explore" style="background:var(--surface-2);color:var(--text);border:1px solid var(--border);padding:10px 20px;border-radius:6px;cursor:pointer;">Explore on My Own</button></div>',
    buttons: [] // We'll handle buttons manually
  });

  // Add event listeners after dialog is created
  setTimeout(() => {
    document.querySelectorAll<HTMLElement>('.success-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action;
        successDialog.remove(); // Close the dialog
        window.releaseScrollLock?.();

        if (action === 'tour') {
          startGuidedTour();
        }
        // Explore action just closes the dialog
      });
    });
  }, 100);

  document.body.appendChild(successDialog);
}

/** Shape shared by every INDUSTRY_TEMPLATES entry; fields beyond offerings are optional per template. */
interface TemplateConfig {
  offerings: Offering[];
  fullTimeEmployees?: number;
  partTimeEmployees?: number;
  fullTimeEmployeePay?: number;
  partTimeEmployeePay?: number;
  monthlyCosts?: number;
  processingFeePct?: number;
  productiveUtilizationPct?: number;
  targetUtilizationPct?: number;
}

function loadOnboardingIndustryTemplate(industryId: string) {
  const state = deps!.getState();
  // Use the same INDUSTRY_TEMPLATES as single source of truth
  const template = (INDUSTRY_TEMPLATES as unknown as Record<string, { config: TemplateConfig }>)[industryId];
  if (template) {
    const config = template.config;

    // Apply template to current scenario - load all offerings like the main menu
    state.offerings = config.offerings.map((o: Offering) => ({
      ...o,
      id: uuid(),
      mixPct: o.mixPct || (100 / config.offerings.length),
      currentClients: o.currentClients || 0
    })) as AppOffering[];

    // Apply employee and cost configuration
    state.fullTimeEmployees = config.fullTimeEmployees || 1;
    state.partTimeEmployees = config.partTimeEmployees || 0;
    state.fullTimeEmployeePay = config.fullTimeEmployeePay || 60000;
    state.partTimeEmployeePay = config.partTimeEmployeePay || 30000;
    state.monthlyCosts = config.monthlyCosts || 250;
    state.processingFeePct = config.processingFeePct || 0;
    state.expenses = [];
    state.resources = [];
  state.membershipPlans = [];
  state.memberProfiles = [];
    state.productiveUtilizationPct = config.productiveUtilizationPct || 80;
    state.targetUtilizationPct = config.targetUtilizationPct || 85;

    // Track that this data came from a template
    state.loadedTemplate = industryId;

    // Refresh the UI
    deps!.render();
    deps!.persistState();
  }
}

function startGuidedTour() {
  // Lock scrolling while the guided tour is active so users can't interrupt
  // the tour by manually scrolling. Programmatic scrolling (scrollIntoView)
  // is still allowed.
  lockScrollForTour();
  const tour = createGuidedTour();
  tour.start();
}

// Global tour state
interface TourStep {
  target: string;
  title: string;
  content: string;
  position?: string;
  [k: string]: unknown;
}

let tourSteps: TourStep[] = [];
let tourActive = false;

function createGuidedTour() {
  tourSteps = [
    {
      target: '.ab-logo',
      title: 'Welcome to ProfitPath',
      content: 'This is your profitability dashboard. Let\'s take a quick tour of the key areas.',
      position: 'bottom'
    },
    {
      target: '.inputs-fields .field',
      title: 'Choose Your Mode',
      content: 'Select <strong>Forecast</strong> mode to plan capacity for a target client count. Use <strong>Current</strong> mode to analyze your existing active client base.',
      position: 'right'
    },
    {
      target: '.team-config-group',
      title: 'Team Configuration',
      content: 'Enter your team size and compensation. ProfitPath assumes 2,080 paid hours per year per full-time employee.',
      position: 'right'
    },
    {
      target: '.offerings-section .section-h',
      title: 'Define Your Services',
      content: 'Add service offerings with pricing, session frequency, and per-session costs. Each offering can have different terms.',
      position: 'right'
    },
    {
      target: '.card-h:last-of-type',
      title: 'Net Income at a Glance',
      content: 'Your net income summary lives here. The pill turns green when profitable and red when you\'re running at a loss.',
      position: 'left'
    },
    {
      target: '.capacity',
      title: 'Capacity Utilization',
      content: 'Monitor how much of your team\'s billable time is in use. Aim for 80–90% — above that risks burnout; below means idle capacity.',
      position: 'left'
    },
    {
      target: '.break-even-section-wrapper',
      title: 'Break-even Analysis',
      content: 'See exactly how many clients and how much revenue you need to cover all costs. The progress bar shows how close you are.',
      position: 'left'
    },
    {
      target: '.charts-visualizations-container',
      title: 'Charts & Visualizations',
      content: 'Interactive charts help you visualize revenue mix, cost breakdown, and profitability trends.',
      position: 'left'
    },
    {
      target: '#appMenuBtn',
      title: 'Save, Export & Share',
      content: 'Open the menu to save scenarios, export reports (CSV, PDF, Excel), compare scenarios side-by-side, and share your analysis.',
      position: 'bottom'
    }
  ];

  tourActive = true;

  return {
    start: () => showTourStep(0)
  };
}

async function showTourStep(stepIndex: number) {
  if (!tourActive || stepIndex >= tourSteps.length) {
    completeTour();
    return;
  }

  const step = tourSteps[stepIndex];
  let target = document.querySelector(step.target);

  // Try fallback selectors if primary target not found
  if (!target) {
    const fallbacks: Record<string, string> = {
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
  const handleKeydown = (e: KeyboardEvent) => {
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

// Helper to wait until scrolling stops and the target is approximately centered
function waitForTargetSettled(target: Element, { timeoutMs = 3000, idleMs = 250, stableMs = 250 } = {}) {
  return new Promise<void>((resolve) => {
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
    let rafId: number | null = null;

    function cleanup() {
      if (idleTimer) clearTimeout(idleTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
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
        } catch {
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

function exitTour() {
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

function completeTour() {
  tourActive = false;
  // Unlock scrolling when the tour completes
  unlockScrollForTour();
  localStorage.setItem('profitpath-onboarding-completed', 'true');

  const completionDialog = createOnboardingDialog({
    title: 'Tour Complete! 🎉',
    content: '<p>You now know the basics of ProfitPath!</p><p>Explore the features at your own pace. Use the ❓ help button anytime for guidance.</p>',
    buttons: [
      { text: 'Got it!', action: () => { }, primary: true }
    ]
  });

  document.body.appendChild(completionDialog);
}

function createTooltip(step: TourStep, target: Element, onNext: (() => void) | null, stepIndex: number, steps: TourStep[]) {
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

  // Create progress dots
  const progressDots = steps.map((_, index) => '<span class="tour-dot ' + (index === stepIndex ? 'active' : '') + ' ' + (index < stepIndex ? 'completed' : '') + '" data-step="' + index + '" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 2px;cursor:pointer;background:' + (index === stepIndex ? '#007bff' : index < stepIndex ? '#28a745' : '#ddd') + ';transition:all 0.2s;"></span>').join('');

  // Create tooltip (initially hidden to measure actual height)
  const tooltip: HTMLDivElement & { _overlay?: HTMLElement; _cleanupKeyboard?: () => void } = document.createElement('div');
  tooltip.className = 'onboarding-tooltip';
  tooltip.style.cssText = 'position: fixed;z-index: 10000;background: var(--surface);color: var(--text);border: 2px solid var(--accent, #007bff);border-radius: 8px;padding: 16px;box-shadow: var(--elev-4, 0 4px 12px rgba(0, 0, 0, 0.15));max-width: ' + (isMobile ? '280px' : '300px') + ';pointer-events: auto;font-size: ' + (isMobile ? '14px' : '16px') + ';visibility: hidden;opacity: 0;transition: opacity 0.3s ease-out;left: 0;top: 0;transform: translate(0, 0);';

  // Set content before measuring
  tooltip.innerHTML = '<div style="position:relative;padding-right:24px;"><button class="tour-exit-btn" style="position:absolute;top:0;right:0;background:transparent;border:none;font-size:16px;cursor:pointer;color:var(--text, #666);padding:4px;line-height:1;">✕</button><div style="font-weight:bold;margin-bottom:8px;color:var(--text, #007bff);">' + step.title + '</div><div style="margin-bottom:16px;color:var(--text, #333);line-height:1.4;">' + step.content + '</div><div style="display:flex;align-items:center;justify-content:center;margin-bottom:12px;position:relative;"><div class="tour-navigation" style="display:flex;align-items:center;">' + (stepIndex > 0 ? '<button class="tour-arrow tour-arrow-prev" data-direction="prev" style="background:var(--surface-2);border:1px solid var(--border);border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-right:8px;font-size:18px;line-height:1;">‹</button>' : '<div style="width:32px;"></div>') + '<div class="tour-dots" style="display:flex;align-items:center;">' + progressDots + '</div>' + (stepIndex < steps.length - 1 ? '<button class="tour-arrow tour-arrow-next" data-direction="next" style="background:#007bff;color:white;border:none;border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-left:8px;font-size:18px;line-height:1;">›</button>' : '<button class="tour-finish-btn" style="background:#28a745;color:white;border:none;border-radius:4px;width:24px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-left:8px;font-size:16px;line-height:1;">✓</button>') + '</div></div></div>';

  // Append to DOM (invisible) and measure actual height
  document.body.appendChild(tooltip);
  const tooltipHeight = tooltip.offsetHeight;

  // Now recalculate position with actual height
  let finalTop = top;
  const finalTransform = transform;

  // Clamp to the viewport in a transform-aware way. `left`/`finalTop` are the
  // anchor point; the transform shifts the box by a fraction of its own size
  // (e.g. translate(-100%) for a tooltip placed to the left of the target). The
  // old clamp ignored the transform, so 'left'/'right'/'top' tooltips got shoved
  // back on top of the element they were pointing at.
  const fracOf = (axis: string) => {
    const m = finalTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    if (!m) return 0;
    const v = (axis === 'x' ? m[1] : m[2]).trim();
    if (v.includes('-100%')) return -1;
    if (v.includes('-50%')) return -0.5;
    return 0;
  };
  // Horizontal: keep the rendered box (left + fx*width .. + width) on screen.
  const fx = fracOf('x');
  let renderedLeft = left + fx * tooltipWidth;
  if (renderedLeft < 10) renderedLeft = 10;
  if (renderedLeft + tooltipWidth > window.innerWidth - 10) renderedLeft = window.innerWidth - tooltipWidth - 10;
  left = renderedLeft - fx * tooltipWidth;
  // Vertical: same, for the rendered top.
  const fy = fracOf('y');
  let renderedTop = finalTop + fy * tooltipHeight;
  if (renderedTop < 10) renderedTop = 10;
  if (renderedTop + tooltipHeight > window.innerHeight - 10) renderedTop = window.innerHeight - tooltipHeight - 10;
  finalTop = renderedTop - fy * tooltipHeight;

  // Set final position while still invisible (prevents jump)
  tooltip.style.left = left + 'px';
  tooltip.style.top = finalTop + 'px';
  tooltip.style.transform = finalTransform;

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
        const targetStep = parseInt((e.currentTarget as HTMLElement).dataset.step || '0');
        tooltip.remove();
        showTourStep(targetStep);
      });
    });
  }, 50);

  // Highlighting: place a fixed overlay around the target so we don't rely on modifying
  // the target's own styles (avoids stacking-context/overflow issues and layout shifts).
  const OVERLAY_PAD = 9; // pixels to expand the highlight beyond the element (increased by 1 to keep outer perimeter)
  const BORDER_THICKNESS = 7; // highlight border thickness (reduced by 1px for less clipping)

  const rect2 = target.getBoundingClientRect();
  const computed = window.getComputedStyle(target);
  // If the target has no rounded corners, use a mild default so highlights look rounded
  const parsedBR = parseFloat(computed.borderRadius) || 0;
  const borderRadius = (parsedBR && parsedBR > 4) ? parsedBR + 'px' : '10px';

  // Create overlay invisibly (will show with tooltip)
  const overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';
  overlay.style.cssText = 'position: fixed;left: ' + (rect2.left - OVERLAY_PAD) + 'px;top: ' + (rect2.top - OVERLAY_PAD) + 'px;width: ' + (rect2.width + OVERLAY_PAD * 2) + 'px;height: ' + (rect2.height + OVERLAY_PAD * 2) + 'px;border: ' + BORDER_THICKNESS + 'px solid #007bff;border-radius: ' + borderRadius + ';box-shadow: 0 8px 32px rgba(0, 123, 255, 0.12);pointer-events: none;z-index: 9999;opacity: 0;transition: opacity 0.3s ease-out;animation: pulse 2s infinite;';

  // Append both overlay and tooltip to DOM (both invisible)
  document.body.appendChild(overlay);

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

  // Double rAF: first frame commits layout, second frame reveals both together (prevents position jump)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      tooltip.style.visibility = 'visible';
      tooltip.style.opacity = '1';
      overlay.style.opacity = '1';
    });
  });

  // Store overlay for cleanup
  tooltip._overlay = overlay;

  // Wrap original remove to also remove the overlay and keyboard handler
  const originalRemove = tooltip.remove;
  tooltip.remove = function () {
    try {
      if (tooltip._overlay && tooltip._overlay.parentNode) tooltip._overlay.parentNode.removeChild(tooltip._overlay);
    } catch {
      // ignore
    }
    if (tooltip._cleanupKeyboard) {
      tooltip._cleanupKeyboard();
    }
    originalRemove.call(this);
  };

  return tooltip;
}

function createOnboardingDialog({ title, content, buttons }: { title: string; content: string; buttons: { text: string; primary?: boolean; action?: () => void }[] }) {
  const dialog = document.createElement('div');
  dialog.className = 'onboarding-dialog-overlay';
  dialog.style.cssText = 'position: fixed;top: 0;left: 0;right: 0;bottom: 0;background: rgba(0, 0, 0, 0.6);display: flex;align-items: center;justify-content: center;z-index: 10001;';

  const dialogContent = document.createElement('div');
  // Theme-aware surface (was hardcoded white, which broke in dark mode).
  dialogContent.className = 'onboarding-dialog-card';
  dialogContent.style.cssText = 'background: var(--surface);color: var(--text);border: 1px solid var(--border-strong);border-radius: 16px;padding: 24px;max-width: 500px;width: 90%;box-shadow: var(--elev-4, 0 8px 32px rgba(0, 0, 0, 0.2));';

  dialogContent.innerHTML = '<h2 style="margin:0 0 16px 0;color:var(--text);font-size:24px;">' + title + '</h2><div style="color:var(--text);line-height:1.5;">' + content + '</div><div style="margin-top:24px;text-align:right;display:flex;gap:8px;justify-content:flex-end;">' + buttons.map((btn, index) => '<button class="dialog-btn ' + (btn.primary ? 'primary' : 'secondary') + '" data-action="' + index + '" data-primary="' + (btn.primary ? 'true' : 'false') + '" style="padding:8px 16px;border:' + (btn.primary ? 'none' : '1px solid var(--border)') + ';border-radius:8px;background:' + (btn.primary ? 'var(--accent)' : 'var(--surface-2)') + ';color:' + (btn.primary ? 'var(--accent-contrast, #fff)' : 'var(--text)') + ';cursor:pointer;font-weight:' + (btn.primary ? '700' : '550') + ';">' + btn.text + '</button>').join('') + '</div>';

  // Shared close that also tears down the Escape listener. Parity with the rest
  // of the app's modals/sheets, which all close on Esc and on scrim click.
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  const close = () => {
    dialog.remove();
    document.removeEventListener('keydown', onKey);
    window.releaseScrollLock?.();
  };
  document.addEventListener('keydown', onKey);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });

  // Add event listeners for dialog buttons
  setTimeout(() => {
    const dialogBtns = dialogContent.querySelectorAll('.dialog-btn');
    dialogBtns.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const action = buttons[index]?.action;
        close();
        if (action && typeof action === 'function') {
          action();
        }
      });
    });
  }, 10);

  dialog.appendChild(dialogContent);
  window.acquireScrollLock?.();
  return dialog;
}

function showHelpMenu() {
  // Reflect the current tooltip state so the option toggles (Enable <-> Disable)
  // rather than always offering to enable.
  let tipsOn = true;
  try {
    tipsOn = JSON.parse(localStorage.getItem('profitpath-settings') || '{}').showTooltips !== false;
  } catch { /* default on */ }
  const btnStyle = 'display:block;width:100%;padding:12px;background:var(--surface-2);border:1px solid var(--border);border-radius:6px;text-align:left;cursor:pointer;';
  const tooltipsBtn = tipsOn
    ? '<button class="help-menu-btn" data-action="tooltips" style="' + btnStyle + '">🚫 <strong>Disable Tooltips</strong><br><small>Turn off contextual help throughout the app</small></button>'
    : '<button class="help-menu-btn" data-action="tooltips" style="' + btnStyle + '">💡 <strong>Show Tooltips</strong><br><small>Enable contextual help throughout the app</small></button>';

  const helpDialog = createOnboardingDialog({
    title: 'Help & Learning Center',
    content: '<div style="display:grid;gap:12px;">' +
      '<button class="help-menu-btn" data-action="tour" style="' + btnStyle + '">🎯 <strong>Take Guided Tour</strong><br><small>Step-by-step walkthrough of key features</small></button>' +
      '<button class="help-menu-btn" data-action="faq" style="' + btnStyle + '">📖 <strong>Quick Reference</strong><br><small>Common questions and calculation formulas</small></button>' +
      '<button class="help-menu-btn" data-action="industry" style="' + btnStyle + '">🏢 <strong>Change Industry</strong><br><small>Switch to a different business template</small></button>' +
      tooltipsBtn +
      '</div>',
    buttons: [
      { text: 'Close', action: () => { } }
    ]
  });

  // Delegated listener on the dialog element — no setTimeout needed
  helpDialog.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLElement>('.help-menu-btn');
    if (!btn) return;
    const action = btn.dataset.action;
    helpDialog.remove();
    window.releaseScrollLock?.();
    if (action === 'tour') startGuidedTour();
    else if (action === 'faq') showQuickReference();
    else if (action === 'industry') showIndustrySelector();
    else if (action === 'tooltips') { if (tipsOn) hideContextualHelp(); else showContextualHelp(); }
  });

  document.body.appendChild(helpDialog);
}

function showQuickReference() {
  const faqHtml = `
<div style="line-height:1.7;color:var(--text)">
  <h4 style="margin:0 0 6px;color:var(--text)">Forecast vs Current mode</h4>
  <p style="margin:0 0 14px;color:var(--muted);font-size:13px"><strong style="color:var(--text)">Forecast</strong> — set a target client count; ProfitPath calculates the capacity and revenue you'd need. <strong style="color:var(--text)">Current</strong> — enter your actual active client counts per offering; ProfitPath shows your live utilization and profitability.</p>

  <h4 style="margin:0 0 6px;color:var(--text)">How utilization is calculated</h4>
  <p style="margin:0 0 14px;color:var(--muted);font-size:13px">Service hours required ÷ (Employees × 2,080 hrs/yr × Productive utilization %). Target 80–90% for a healthy, sustainable pace.</p>

  <h4 style="margin:0 0 6px;color:var(--text)">What contribution margin means</h4>
  <p style="margin:0 0 14px;color:var(--muted);font-size:13px">Revenue per client per year minus the variable costs to serve them. Each client's contribution margin goes toward covering your fixed costs (rent, payroll, insurance). When the total exceeds fixed costs, you're profitable.</p>

  <h4 style="margin:0 0 6px;color:var(--text)">Break-even clients</h4>
  <p style="margin:0 0 14px;color:var(--muted);font-size:13px">Fixed costs ÷ Contribution margin per client. Below this number = operating at a loss. Above it = profitable. The progress bar shows how close you are.</p>

  <h4 style="margin:0 0 6px;color:var(--text)">Saving and comparing scenarios</h4>
  <p style="margin:0 0 14px;color:var(--muted);font-size:13px">Use <strong style="color:var(--text)">Scenarios</strong> (app menu or bottom bar) to save your current setup with a name. Load it later, or select two saved scenarios and hit <strong style="color:var(--text)">Compare</strong> to see a side-by-side diff of every metric.</p>

  <h4 style="margin:0 0 6px;color:var(--text)">Exporting and sharing</h4>
  <p style="margin:0 0 0;color:var(--muted);font-size:13px">Open the app menu → <strong style="color:var(--text)">Export</strong> for CSV, Excel, PDF, HTML, email, and embed options. Use <strong style="color:var(--text)">Share</strong> to generate a URL that encodes your current scenario so others can view it without any account.</p>
</div>`;

  createModal({ title: 'Quick Reference', content: faqHtml, size: 'md' });
}

function initializeContextualTooltips() {
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
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      element.dataset.tooltip = content;
    }
  });
}

// Silent tooltip UI update (no toast) - for syncing with settings
export function updateTooltipsUIOnly(enabled: boolean) {
  const tooltipElements = document.querySelectorAll<HTMLElement & { _tooltip?: HTMLElement }>('[title]');

  if (enabled) {
    // Enable tooltips without showing toast
    tooltipElements.forEach(el => {
      if (!el.dataset.tooltipEnabled) {
        el.dataset.originalTitle = el.title;
        el.dataset.tooltipEnabled = 'true';
        el.title = '';
        el.addEventListener('mouseenter', showEnhancedTooltip);
        el.addEventListener('mouseleave', hideEnhancedTooltip);
      }
    });
  } else {
    // Disable tooltips without showing toast
    tooltipElements.forEach(el => {
      if (el.dataset.tooltipEnabled === 'true') {
        el.title = el.dataset.originalTitle || '';
        delete el.dataset.tooltipEnabled;
        delete el.dataset.originalTitle;
        el.removeEventListener('mouseenter', showEnhancedTooltip);
        el.removeEventListener('mouseleave', hideEnhancedTooltip);
        // Clear tooltip if it's currently showing
        if (el._tooltip) {
          el._tooltip.remove();
          delete el._tooltip;
        }
      }
    });
    // Clear any existing tooltips
    const activeTooltips = document.querySelectorAll('.enhanced-tooltip');
    activeTooltips.forEach(t => t.remove());
  }
}

export function hideContextualHelp() {
  // Disable enhanced tooltips with confirmation toast
  updateTooltipsUIOnly(false);

  // Update settings to reflect tooltips are disabled
  setTooltipsEnabled(false);
  if (updateSetting) {
    updateSetting('showTooltips', false);
  }

  // Show confirmation
  showToast('Contextual tooltips disabled.', 'info', 1800);
}

function showContextualHelp() {
  // Enable enhanced tooltips with confirmation toast
  updateTooltipsUIOnly(true);

  // Update settings to reflect tooltips are enabled
  setTooltipsEnabled(true);
  if (updateSetting) {
    updateSetting('showTooltips', true);
  }

  // Show confirmation
  showToast('Contextual tooltips enabled! Hover over elements to see help.', 'info', 1800);
}

type TooltipHost = HTMLElement & { _tooltip?: HTMLElement };

function showEnhancedTooltip(e: Event) {
  const target = e.target as TooltipHost;
  // Check if tooltips are actually enabled (check localStorage for current setting)
  try {
    const settings = JSON.parse(localStorage.getItem('profitpath-settings') || '{}');
    if ('showTooltips' in settings && settings.showTooltips === false) {
      hideEnhancedTooltip(e);
      return;
    }
  } catch {
    // Continue with default behavior if settings can't be read
  }

  const content = target.dataset.originalTitle;
  if (!content) return;

  const tooltip = document.createElement('div');
  tooltip.className = 'enhanced-tooltip';
  tooltip.textContent = content;
  tooltip.style.cssText = 'position: fixed;background: #333;color: white;padding: 8px 12px;border-radius: 4px;font-size: 12px;z-index: 10002;pointer-events: none;max-width: 200px;word-wrap: break-word;';

  document.body.appendChild(tooltip);

  const rect = target.getBoundingClientRect();
  const tRect = tooltip.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;

  // Clamp left so tooltip doesn't overflow viewport edges
  const halfWidth = tRect.width / 2;
  const clampedLeft = Math.min(Math.max(centerX, halfWidth + 8), window.innerWidth - halfWidth - 8);
  tooltip.style.left = clampedLeft + 'px';
  tooltip.style.transform = 'translateX(-50%)';

  // Force below if element has data-tooltip-below, or if too close to the top
  if ('tooltipBelow' in target.dataset || rect.top - tRect.height - 12 < 0) {
    tooltip.style.top = (rect.bottom + 8) + 'px';
  } else {
    tooltip.style.top = (rect.top - 8) + 'px';
    tooltip.style.transform += ' translateY(-100%)';
  }

  target._tooltip = tooltip;
}

function hideEnhancedTooltip(e: Event) {
  const target = e.target as TooltipHost | null;
  if (target && target._tooltip) {
    target._tooltip.remove();
    delete target._tooltip;
  }
}
