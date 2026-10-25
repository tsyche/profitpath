import { calcMembership, sanitizePlans, sanitizeProfiles, MAX_PLANS, MAX_PROFILES } from '../../src/calculations/membership';
import type { CatalogOffering } from '../../src/calculations/membership';
import { fmtMoney0 } from '../../src/calculations/currency';
import type { MemberProfile, MembershipPlan } from '../../src/types';
import { escapeHtml } from '../services/miscService';
import { uuid } from '../utils/helpers';

/**
 * Membership what-if panel (ROADMAP 24a). Editors for up to 3 plans and 3 member profiles,
 * plus a profile x plan comparison. Display only: nothing here feeds calc() or the Outputs totals.
 * Element IDs are stable on purpose: the UI/UX pass relocates the panel (docs/plans/ui-ux-pass.md).
 */

type PanelOffering = CatalogOffering & { name?: string };

interface PanelState {
  offerings: PanelOffering[];
  membershipPlans?: MembershipPlan[];
  memberProfiles?: MemberProfile[];
}

interface PanelDeps {
  getState: () => PanelState;
  persist: () => void;
  pushHistory: () => void;
}

let deps: PanelDeps | null = null;
let lastHistoryField: string | null = null;

const $ = (sel: string) => document.querySelector<HTMLElement>(sel);
const pct1 = (n: number) => n.toFixed(1) + '%';
const num = (v: number) => String(v);

function isOpen(): boolean {
  const body = $('#membershipBody');
  return !!body && !body.classList.contains('collapsed');
}

function listsOf(s: PanelState): { plans: MembershipPlan[]; profiles: MemberProfile[] } {
  return { plans: s.membershipPlans || (s.membershipPlans = []), profiles: s.memberProfiles || (s.memberProfiles = []) };
}

const offeringName = (o: PanelOffering, idx: number) => o.name || 'Offering ' + (idx + 1);

function editorHtml(s: PanelState): string {
  const { plans, profiles } = listsOf(s);
  const offerings = s.offerings;

  const planRows = plans.map((p, i) =>
    '<tr><td class="cell-edit" data-label="Plan"><input aria-label="Plan name" type="text" maxlength="100" value="' + escapeHtml(p.name) + '" data-kind="plan" data-k="name" data-i="' + i + '"/></td>' +
    '<td class="cell-edit" data-label="Fee / month"><input aria-label="Monthly fee for ' + escapeHtml(p.name) + '" type="number" min="0" step="1" value="' + num(p.monthlyFee) + '" data-kind="plan" data-k="monthlyFee" data-i="' + i + '"/></td>' +
    '<td class="cell-edit" data-label="Credits / month"><input aria-label="Credits per month for ' + escapeHtml(p.name) + '" type="number" min="0" step="1" value="' + num(p.creditsPerMonth) + '" data-kind="plan" data-k="creditsPerMonth" data-i="' + i + '"/></td>' +
    '<td class="cell-edit" data-label="Member discount %"><input aria-label="Member discount percent for ' + escapeHtml(p.name) + '" type="number" min="0" max="100" step="1" value="' + num(p.memberDiscountPct) + '" data-kind="plan" data-k="memberDiscountPct" data-i="' + i + '"/></td>' +
    '<td class="cell-edit" data-label="Credits at member price"><input aria-label="Credits redeem at member price for ' + escapeHtml(p.name) + '" type="checkbox"' + (p.creditsAtMemberPrice ? ' checked' : '') + ' data-kind="plan" data-k="creditsAtMemberPrice" data-i="' + i + '"/></td>' +
    '<td class="cell-edit" data-label="Actions"><button class="btn small danger" type="button" data-action="removePlan" data-i="' + i + '" aria-label="Remove ' + escapeHtml(p.name) + '">Remove</button></td></tr>').join('');

  const planTable = plans.length
    ? '<div class="table-wrap"><table class="table membership-table" aria-label="Membership plans"><thead><tr>' +
      '<th>Plan</th><th title="What the member pays each month">Fee / month</th>' +
      '<th title="Credits granted each month, valued at list price">Credits / month</th>' +
      '<th title="Off list price on eligible services the credits do not cover">Member discount %</th>' +
      '<th title="Off by default (no stacking): credits redeem at list price and the discount applies only to cash beyond them. Tick to let credits redeem at the discounted price.">Credits at member price</th><th></th>' +
      '</tr></thead><tbody id="membershipPlansBody">' + planRows + '</tbody></table></div>'
    : '<p class="smallprint">No plans yet. Add one to see what a member saves and what you keep.</p>';

  const eligibleTable = plans.length && offerings.length
    ? '<div class="table-wrap"><table class="table membership-table" aria-label="Services each plan covers"><thead><tr><th>Plan covers</th>' +
      plans.map((p) => '<th>' + escapeHtml(p.name) + '</th>').join('') + '</tr></thead><tbody id="membershipEligibleBody">' +
      offerings.map((o, oi) => '<tr><td data-label="Offering">' + escapeHtml(offeringName(o, oi)) + '</td>' +
        plans.map((p, pi) => '<td class="cell-edit" data-label="' + escapeHtml(p.name) + '"><input type="checkbox" aria-label="' + escapeHtml(p.name) + ' covers ' + escapeHtml(offeringName(o, oi)) + '"' +
          (o.id && p.eligible.includes(o.id) ? ' checked' : '') + ' data-kind="eligible" data-i="' + pi + '" data-o="' + escapeHtml(o.id || '') + '"/></td>').join('') + '</tr>').join('') +
      '</tbody></table></div>'
    : '';

  const visitsTable = profiles.length && offerings.length
    ? '<div class="table-wrap"><table class="table membership-table" aria-label="Visits per month for each member profile"><thead><tr><th>Visits / month</th>' +
      profiles.map((p, i) => '<th><input aria-label="Member profile name" type="text" maxlength="100" value="' + escapeHtml(p.name) + '" data-kind="profile" data-k="name" data-i="' + i + '"/>' +
        ' <button class="btn small danger" type="button" data-action="removeProfile" data-i="' + i + '" aria-label="Remove ' + escapeHtml(p.name) + '">Remove</button></th>').join('') +
      '</tr></thead><tbody id="membershipVisitsBody">' +
      offerings.map((o, oi) => '<tr><td data-label="Offering">' + escapeHtml(offeringName(o, oi)) + '</td>' +
        profiles.map((p, pi) => '<td class="cell-edit" data-label="' + escapeHtml(p.name) + '"><input type="number" min="0" max="1000" step="0.5" aria-label="Visits per month for ' + escapeHtml(p.name) + ' at ' + escapeHtml(offeringName(o, oi)) + '" value="' +
          num(o.id ? p.visits[o.id] || 0 : 0) + '" data-kind="visits" data-p="' + pi + '" data-o="' + escapeHtml(o.id || '') + '"/></td>').join('') + '</tr>').join('') +
      '</tbody></table></div>'
    : '';

  const profilesEmpty = profiles.length ? '' : '<p class="smallprint">No member profiles yet. A profile is a typical member: how many visits a month, per service.</p>';

  return planTable + eligibleTable + profilesEmpty + visitsTable +
    '<div class="section-actions" style="margin-top: 8px;">' +
    '<button class="btn" type="button" id="addMembershipPlanBtn" data-action="addPlan"' + (plans.length >= MAX_PLANS ? ' disabled' : '') + '>Add plan</button> ' +
    '<button class="btn" type="button" id="addMemberProfileBtn" data-action="addProfile"' + (profiles.length >= MAX_PROFILES ? ' disabled' : '') + '>Add member profile</button></div>';
}

function signed(n: number): string {
  return (n < 0 ? '-' : '+') + fmtMoney0(Math.abs(n));
}

function cellHtml(plan: MembershipPlan, profile: MemberProfile, offerings: PanelOffering[]): string {
  const r = calcMembership(plan, profile, offerings);
  const saving = r.savings >= 0
    ? 'Member saves ' + fmtMoney0(r.savings)
    : 'Member pays ' + fmtMoney0(-r.savings) + ' more';
  const lines = [
    'Member pays ' + fmtMoney0(r.memberSpend) + ' vs ' + fmtMoney0(r.regularSpend) + ' regular',
    '<strong>' + saving + (r.savingsPct === null ? '' : ' (' + pct1(Math.abs(r.savingsPct)) + ' of regular spend)') + '</strong>'
  ];
  if (plan.creditsPerMonth > 0) {
    lines.push('Credits unused ' + fmtMoney0(r.creditsUnused) + (r.breakagePct === null ? '' : ' (' + pct1(r.breakagePct) + ' of credits granted)'));
  }
  lines.push('You keep ' + fmtMoney0(r.margin) + ' of ' + fmtMoney0(r.revenue) + ' revenue' + (r.marginPct === null ? '' : ' (' + pct1(r.marginPct) + ' margin on revenue)'));
  lines.push(r.staffHours.toFixed(1) + ' staff h/month');
  return lines.map((l) => '<div>' + l + '</div>').join('');
}

function resultsHtml(s: PanelState): string {
  const { plans, profiles } = listsOf(s);
  if (!plans.length || !profiles.length) return '<p class="smallprint">Add at least one plan and one member profile to compare.</p>';
  const head = plans.map((p) => '<th>' + escapeHtml(p.name) + '<div class="smallprint">Headline: credits minus fee = ' + signed(p.creditsPerMonth - p.monthlyFee) + '</div></th>').join('');
  const rows = profiles.map((pr) =>
    '<tr><th scope="row">' + escapeHtml(pr.name) + '</th>' + plans.map((pl) => '<td>' + cellHtml(pl, pr, s.offerings) + '</td>').join('') + '</tr>').join('');
  return '<div class="table-wrap"><table class="table membership-results" aria-label="Membership comparison"><thead><tr><th></th>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

/** Re-renders only the comparison; safe to call while the user is typing in the editors. */
export function renderMembershipResults(): void {
  const el = $('#membershipResults');
  if (!el || !deps || !isOpen()) return;
  el.innerHTML = resultsHtml(deps.getState());
}

/** Re-renders editors and comparison; call when plans, profiles or offerings change shape. */
export function renderMembershipPanel(): void {
  const el = $('#membershipEditor');
  if (!el || !deps || !isOpen()) return;
  el.innerHTML = editorHtml(deps.getState());
  renderMembershipResults();
}

function changed(structural: boolean): void {
  deps?.persist();
  if (structural) renderMembershipPanel();
  else renderMembershipResults();
}

function recordHistory(key: string): void {
  if (key === lastHistoryField) return;
  lastHistoryField = key;
  deps?.pushHistory();
}

function onInput(e: Event): void {
  const el = e.target;
  if (!deps || !(el instanceof HTMLInputElement) || el.type === 'checkbox') return;
  const { plans, profiles } = listsOf(deps.getState());
  const kind = el.dataset.kind;
  const k = el.dataset.k;
  if (kind === 'plan' && k) {
    const row = plans[Number(el.dataset.i)] as unknown as Record<string, unknown> | undefined;
    if (!row) return;
    recordHistory('plan-' + el.dataset.i + '-' + k);
    row[k] = (sanitizePlans([{ ...row, [k]: el.value }], () => String(row.id))[0] as unknown as Record<string, unknown>)[k];
    changed(false);
  } else if (kind === 'profile' && k === 'name') {
    const row = profiles[Number(el.dataset.i)];
    if (!row) return;
    recordHistory('profile-' + el.dataset.i + '-name');
    row.name = sanitizeProfiles([{ ...row, name: el.value }], () => row.id)[0].name;
    changed(false);
  } else if (kind === 'visits') {
    const row = profiles[Number(el.dataset.p)];
    const oid = el.dataset.o;
    if (!row || !oid) return;
    recordHistory('visits-' + el.dataset.p + '-' + oid);
    row.visits[oid] = sanitizeProfiles([{ id: row.id, name: row.name, visits: { [oid]: el.value } }], () => row.id)[0].visits[oid];
    changed(false);
  }
}

function onChange(e: Event): void {
  const el = e.target;
  if (!deps || !(el instanceof HTMLInputElement) || el.type !== 'checkbox') return;
  const { plans } = listsOf(deps.getState());
  const row = plans[Number(el.dataset.i)];
  if (!row) return;
  deps.pushHistory();
  if (el.dataset.kind === 'plan' && el.dataset.k === 'creditsAtMemberPrice') {
    row.creditsAtMemberPrice = el.checked;
  } else if (el.dataset.kind === 'eligible' && el.dataset.o) {
    const oid = el.dataset.o;
    row.eligible = el.checked ? Array.from(new Set([...row.eligible, oid])) : row.eligible.filter((id) => id !== oid);
  } else {
    return;
  }
  changed(false);
}

function onClick(e: Event): void {
  const btn = (e.target as HTMLElement | null)?.closest<HTMLElement>('button[data-action]');
  if (!deps || !btn) return;
  const s = deps.getState();
  const { plans, profiles } = listsOf(s);
  const i = Number(btn.dataset.i);
  switch (btn.dataset.action) {
    case 'addPlan':
      if (plans.length >= MAX_PLANS) return;
      deps.pushHistory();
      plans.push({ id: uuid(), name: 'Plan ' + (plans.length + 1), monthlyFee: 0, creditsPerMonth: 0, memberDiscountPct: 0, creditsAtMemberPrice: false, eligible: s.offerings.map((o) => o.id || '').filter(Boolean) });
      break;
    case 'addProfile':
      if (profiles.length >= MAX_PROFILES) return;
      deps.pushHistory();
      profiles.push({ id: uuid(), name: 'Member ' + (profiles.length + 1), visits: {} });
      break;
    case 'removePlan':
      if (!plans[i]) return;
      deps.pushHistory();
      plans.splice(i, 1);
      break;
    case 'removeProfile':
      if (!profiles[i]) return;
      deps.pushHistory();
      profiles.splice(i, 1);
      break;
    default:
      return;
  }
  changed(true);
}

/** Wires the delegated handlers once; the panel's open/close toggle is bound by the caller. */
export function initMembershipPanel(d: PanelDeps): void {
  deps = d;
  const body = $('#membershipBody');
  if (!body) return;
  body.addEventListener('input', onInput);
  body.addEventListener('change', onChange);
  body.addEventListener('click', onClick);
  body.addEventListener('blur', () => { lastHistoryField = null; }, true);
}
