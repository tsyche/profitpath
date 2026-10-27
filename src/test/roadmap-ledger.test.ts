import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ledger = readFileSync(resolve(process.cwd(), 'docs/ledger/ROADMAP_SHIPPED.md'), 'utf8');
const roadmap = readFileSync(resolve(process.cwd(), 'ROADMAP.md'), 'utf8');
const archivedSections = ledger.split(/(?=^### )/m).filter((section) => section.startsWith('### '));
const unresolvedMarker = /\b(?:still open|deferred|not built|not modeled|not yet|only if .*proves|if .*revisited|not warranted|known gap|gap, not bug)\b/i;

describe('shipped roadmap ledger handoff', () => {
  it('points every deferred follow-up or known gap to the active roadmap', () => {
    const missingLinks = archivedSections.filter((section) => {
      if (!unresolvedMarker.test(section)) return false;
      const roadmapLinks = [...section.matchAll(/\[ROADMAP\.md[^\]]*\]\([^)]+\)/gi)];
      const ids = roadmapLinks.flatMap((link) => [...link[0].matchAll(/\b(\d+[a-z]*)\b/g)].map((match) => match[1]));
      return ids.length === 0 || ids.some((id) => !new RegExp(`^${id}\\.`, 'm').test(roadmap));
    }).map((section) => section.split('\n', 1)[0]);
    expect(missingLinks).toEqual([]);
  });
});
