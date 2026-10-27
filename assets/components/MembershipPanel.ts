import { calcMembership, calcMembershipRange, hasVisitRange, maxMembers, recommendCredits, recommendDiscount, recommendFee, sanitizePlans, sanitizeProfiles, MAX_PLANS, MAX_PROFILES } from '../../src/calculations/membership';
import type { CapacityPool, CatalogOffering } from '../../src/calculations/membership';
import { STAFF_POOL_ID, activeResources, resourceAnnualHours } from '../../src/calculations/resources';
import { fmtMoney0 } from '../../src/calculations/currency';
import type { MemberProfile, MembershipPlan, Resource } from '../../src/types';
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
  resources?: Resource[];
  targetUtilizationPct?: number;
  processingFeePct?: number;
}

interface PanelDeps {
  getState: () => PanelState;
  /** Staff hours a year at target utilization, from the last calc(). */
  getStaffTargetHours: () => number;
  getPoolUsageHours: () => Record<string, number>;
  persist: () => void;
  pushHistory: () => void;
}

let deps: PanelDeps | null = null;
let lastHistoryField: string | null = null;
/** Session-only target for the fee recommendation; blank (NaN) turns the line off. */
let targetMarginPct = NaN;

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

  const includedVisitsTable = plans.length && offerings.length
    ? '<details class="smallprint" style="margin-top: 8px;"' + (plans.some((p) => Object.keys(p.includedVisits || {}).length > 0) ? ' open' : '') + '><summary>Included visits by service (optional)</summary>' +
      '<p class="smallprint">Included visits are used first each month, before shared credits. Delivery costs and staff hours still count.</p>' +
      '<div class="table-wrap"><table class="table membership-table" aria-label="Included monthly visits by plan and service"><thead><tr><th>Included visits / month</th>' +
      plans.map((p) => '<th>' + escapeHtml(p.name) + '</th>').join('') + '</tr></thead><tbody id="membershipIncludedVisitsBody">' +
      offerings.map((o, oi) => '<tr><td data-label="Offering">' + escapeHtml(offeringName(o, oi)) + '</td>' +
        plans.map((p, pi) => '<td class="cell-edit" data-label="' + escapeHtml(p.name) + '"><input type="number" min="0" max="1000" step="0.5" aria-label="Included monthly visits for ' + escapeHtml(p.name) + ' at ' + escapeHtml(offeringName(o, oi)) +
          '" value="' + num(o.id ? p.includedVisits?.[o.id] || 0 : 0) + '" data-kind="includedVisits" data-i="' + pi + '" data-o="' + escapeHtml(o.id || '') + '"/></td>').join('') + '</tr>').join('') +
      '</tbody></table></div></details>'
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

  const rangeCell = (p: MemberProfile, pi: number, o: PanelOffering, oi: number, side: 'Low' | 'High') => {
    const bound = o.id ? (p['visits' + side as 'visitsLow' | 'visitsHigh'] || {})[o.id] : undefined;
    return '<td class="cell-edit" data-label="' + escapeHtml(p.name) + ' ' + side.toLowerCase() + '"><input type="number" min="0" max="1000" step="0.5" placeholder="none" aria-label="' + side + ' visits per month for ' + escapeHtml(p.name) + ' at ' + escapeHtml(offeringName(o, oi)) +
      '" value="' + (bound === undefined ? '' : num(bound)) + '" data-kind="visits' + side + '" data-p="' + pi + '" data-o="' + escapeHtml(o.id || '') + '"/></td>';
  };
  const rangeTable = profiles.length && offerings.length
    ? '<details class="smallprint" style="margin-top: 8px;"' + (profiles.some(hasVisitRange) ? ' open' : '') + '><summary>Visit ranges (optional)</summary>' +
      '<p class="smallprint">Leave blank for a fixed number. Results show the spread when every low, or every high, comes true together.</p>' +
      '<div class="table-wrap"><table class="table membership-table" aria-label="Optional low and high visits per month for each member profile"><thead><tr><th>Visits / month</th>' +
      profiles.map((p) => '<th>' + escapeHtml(p.name) + ' low</th><th>' + escapeHtml(p.name) + ' high</th>').join('') + '</tr></thead><tbody id="membershipRangeBody">' +
      offerings.map((o, oi) => '<tr><td data-label="Offering">' + escapeHtml(offeringName(o, oi)) + '</td>' +
        profiles.map((p, pi) => rangeCell(p, pi, o, oi, 'Low') + rangeCell(p, pi, o, oi, 'High')).join('') + '</tr>').join('') +
      '</tbody></table></div></details>'
    : '';

  const profilesEmpty = profiles.length ? '' : '<p class="smallprint">No member profiles yet. A profile is a typical member: how many visits a month, per service.</p>';

  return planTable + eligibleTable + includedVisitsTable + profilesEmpty + visitsTable + rangeTable +
    '<div class="section-actions" style="margin-top: 8px;">' +
    '<button class="btn" type="button" id="addMembershipPlanBtn" data-action="addPlan"' + (plans.length >= MAX_PLANS ? ' disabled' : '') + '>Add plan</button> ' +
    '<button class="btn" type="button" id="addMemberProfileBtn" data-action="addProfile"' + (profiles.length >= MAX_PROFILES ? ' disabled' : '') + '>Add member profile</button></div>';
}

function signed(n: number): string {
  return (n < 0 ? '-' : '+') + fmtMoney0(Math.abs(n));
}

/** Staff plus each active resource, in annual hours at target utilization. */
function capacityPools(s: PanelState): CapacityPool[] {
  const target = (s.targetUtilizationPct ?? 100) / 100;
  const usage = deps?.getPoolUsageHours() || {};
  return [
    { id: STAFF_POOL_ID, name: 'Staff', hours: deps?.getStaffTargetHours() ?? 0, usedHours: usage[STAFF_POOL_ID] || 0 },
    ...activeResources(s.resources).map((r) => ({ id: r.id, name: r.name, hours: resourceAnnualHours(r) * target, usedHours: usage[r.id] || 0, ...(r.staffFree ? { staffFree: true } : {}) }))
  ];
}

function fitLine(profile: MemberProfile, s: PanelState): string {
  const pools = capacityPools(s);
  const cap = maxMembers(profile, s.offerings, pools);
  if (cap.members === null) return 'Members that fit: no limit (no staff or pool hours)';
  const name = pools.find((p) => p.id === cap.binding)?.name ?? '';
  return 'Fits ' + cap.members + ' member' + (cap.members === 1 ? '' : 's') + ' before ' + escapeHtml(name) + ' is full (after scenario load)';
}

function feeLine(plan: MembershipPlan, profile: MemberProfile, offerings: PanelOffering[], processingFeePct: number): string | null {
  if (Number.isNaN(targetMarginPct)) return null;
  const r = recommendFee(plan, profile, offerings, targetMarginPct, processingFeePct);
  const target = pct1(targetMarginPct) + ' margin';
  if (r.feasible) return 'Fee for ' + target + ': ' + fmtMoney0(r.fee) + ' / month (member still saves below ' + fmtMoney0(r.maxFee) + ')';
  if (r.reason === 'member-loses') return 'No fee reaches ' + target + ' while the member still saves: needs ' + fmtMoney0(r.fee) + ', member saves only below ' + fmtMoney0(r.maxFee) + '. Change credits or discount.';
  return r.reason === 'no-visits' ? 'Fee for ' + target + ': add visits to this profile' : 'Target margin must be 0 to 99%';
}

function cellHtml(plan: MembershipPlan, profile: MemberProfile, s: PanelState): string {
  const offerings = s.offerings;
  const r = calcMembership(plan, profile, offerings, s.processingFeePct);
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
  if (r.includedVisitsUsed > 0) lines.push(r.includedVisitsUsed.toFixed(1) + ' included visits used');
  lines.push('You keep ' + fmtMoney0(r.margin) + ' of ' + fmtMoney0(r.keptRevenue) + ' revenue' + (r.marginPct === null ? '' : ' (' + pct1(r.marginPct) + ' margin on revenue)'));
  lines.push(r.staffHours.toFixed(1) + ' staff h/month');
  lines.push('<span class="membership-fit">' + fitLine(profile, s) + '</span>');
  const fee = feeLine(plan, profile, offerings, s.processingFeePct ?? 0);
  if (fee) lines.push('<span class="membership-fee">' + fee + '</span>');
  if (!Number.isNaN(targetMarginPct)) {
    const credits = recommendCredits(plan, profile, offerings, targetMarginPct, s.processingFeePct);
    const discount = recommendDiscount(plan, profile, offerings, targetMarginPct, s.processingFeePct);
    if (credits !== null) lines.push('<span class="membership-fee">Credits for ' + pct1(targetMarginPct) + ' margin: ' + fmtMoney0(credits) + ' / month</span>');
    if (discount !== null) lines.push('<span class="membership-fee">Discount for ' + pct1(targetMarginPct) + ' margin: ' + pct1(discount) + '</span>');
  }
  const band = calcMembershipRange(plan, profile, offerings, s.processingFeePct);
  if (band) {
    const span = (a: number, b: number) => (a === b ? fmtMoney0(a) : fmtMoney0(a) + ' to ' + fmtMoney0(b));
    lines.push('<span class="membership-range">Visit range: member saves ' + (band.savings.min === band.savings.max ? signed(band.savings.min) : signed(band.savings.min) + ' to ' + signed(band.savings.max)) +
      '; you keep ' + span(band.margin.min, band.margin.max) + '; ' + band.staffHours.min.toFixed(1) + ' to ' + band.staffHours.max.toFixed(1) + ' staff h/month</span>');
  }
  return lines.map((l) => '<div>' + l + '</div>').join('');
}

function resultsHtml(s: PanelState): string {
  const { plans, profiles } = listsOf(s);
  if (!plans.length || !profiles.length) return '<p class="smallprint">Add at least one plan and one member profile to compare.</p>';
  const head = plans.map((p) => '<th>' + escapeHtml(p.name) + '<div class="smallprint">Fee ' + fmtMoney0(p.monthlyFee) + ' / month · credits ' + fmtMoney0(p.creditsPerMonth) + ' / month' +
    (Object.keys(p.includedVisits || {}).length ? ' · service visits included' : '') + '</div></th>').join('');
  const rows = profiles.map((pr) =>
    '<tr><th scope="row">' + escapeHtml(pr.name) + '</th>' + plans.map((pl) => '<td>' + cellHtml(pl, pr, s) + '</td>').join('') + '</tr>').join('');
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
  if (el instanceof HTMLInputElement && el.id === 'membershipTargetMargin') {
    targetMarginPct = el.value.trim() === '' ? NaN : Number(el.value);
    renderMembershipResults();
    return;
  }
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
  } else if (kind === 'includedVisits') {
    const row = plans[Number(el.dataset.i)];
    const oid = el.dataset.o;
    if (!row || !oid) return;
    recordHistory('includedVisits-' + el.dataset.i + '-' + oid);
    const clean = sanitizePlans([{ ...row, includedVisits: { [oid]: el.value } }], () => row.id)[0].includedVisits?.[oid] || 0;
    const map = { ...(row.includedVisits || {}) };
    if (clean > 0) map[oid] = clean;
    else delete map[oid];
    row.includedVisits = map;
    changed(false);
  } else if (kind === 'profile' && k === 'name') {
    const row = profiles[Number(el.dataset.i)];
    if (!row) return;
    recordHistory('profile-' + el.dataset.i + '-name');
    row.name = sanitizeProfiles([{ ...row, name: el.value }], () => row.id)[0].name;
    changed(false);
  } else if (kind === 'visitsLow' || kind === 'visitsHigh') {
    const row = profiles[Number(el.dataset.p)];
    const oid = el.dataset.o;
    if (!row || !oid) return;
    recordHistory(kind + '-' + el.dataset.p + '-' + oid);
    const clean = sanitizeProfiles([{ id: row.id, name: row.name, visits: {}, [kind]: { [oid]: el.value } }], () => row.id)[0][kind];
    const map = { ...(row[kind] || {}) };
    if (clean && clean[oid] !== undefined) map[oid] = clean[oid];
    else delete map[oid];
    if (Object.keys(map).length) row[kind] = map;
    else delete row[kind];
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
