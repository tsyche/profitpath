import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import type { CalcState } from '../types';
import { sanitizeScenarioState } from './sanitizeScenario';

const PREFIX = 'v1.';
const MAX_LINK_CHARS = 20000;
const MAX_JSON_BYTES = 500000;
const MAX_BUNDLE_SCENARIOS = 4;

export type BundleEntry = { name: string; state: CalcState };

function toBase64Url(bytes: Uint8Array): string {
  let raw = '';
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

export function encodeScenarioBundle(scenarios: readonly { name: string; state?: CalcState; data?: CalcState }[], baseUrl: string): string | null {
  if (!scenarios.length || scenarios.length > MAX_BUNDLE_SCENARIOS) return null;
  const entries: BundleEntry[] = [];
  for (const scenario of scenarios) {
    const safe = sanitizeScenarioState((scenario.state ?? scenario.data) as Record<string, unknown>);
    if (!safe) return null;
    entries.push({ name: String(scenario.name || 'Shared scenario').trim().slice(0, 120), state: safe });
  }
  const json = strToU8(JSON.stringify({ version: 1, scenarios: entries }));
  if (json.length > MAX_JSON_BYTES) return null;
  const payload = PREFIX + toBase64Url(deflateSync(json, { level: 9 }));
  return payload.length <= MAX_LINK_CHARS ? baseUrl + '?bundle=' + payload : null;
}

export function decodeScenarioBundle(payload: string): BundleEntry[] | null {
  if (!payload.startsWith(PREFIX) || payload.length > MAX_LINK_CHARS) return null;
  try {
    // fflate truncates a caller-supplied buffer instead of allocating unbounded output.
    // One sentinel byte lets us reject expansion beyond the documented JSON limit.
    const raw = inflateSync(fromBase64Url(payload.slice(PREFIX.length)), { out: new Uint8Array(MAX_JSON_BYTES + 1) });
    if (raw.length > MAX_JSON_BYTES) return null;
    const data: unknown = JSON.parse(strFromU8(raw));
    if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1 || !('scenarios' in data) || !Array.isArray(data.scenarios)) return null;
    if (!data.scenarios.length || data.scenarios.length > MAX_BUNDLE_SCENARIOS) return null;
    const entries: BundleEntry[] = [];
    for (const item of data.scenarios) {
      if (!item || typeof item !== 'object' || typeof item.name !== 'string' || !item.name.trim()) return null;
      const safe = sanitizeScenarioState(item.state as Record<string, unknown>);
      if (!safe) return null;
      entries.push({ name: item.name.trim().slice(0, 120), state: safe });
    }
    return entries;
  } catch {
    return null;
  }
}

