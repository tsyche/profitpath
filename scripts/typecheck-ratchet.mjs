// Type-error ratchet (docs/plans/typescript-migration.md, Phase 1): fail when `tsc`
// reports more errors than `.typecheck-baseline`, so the count can only fall.
//   node scripts/typecheck-ratchet.mjs           check against the baseline
//   node scripts/typecheck-ratchet.mjs --update  write the current count as the baseline
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASELINE_FILE = new URL('../.typecheck-baseline', import.meta.url);

export function countErrors(output) {
  return (output.match(/error TS\d+/g) || []).length;
}

export function evaluate(count, baseline) {
  if (count > baseline) return { ok: false, message: `${count} type errors, baseline is ${baseline}: fix the ${count - baseline} new one(s)` };
  if (count < baseline) return { ok: true, message: `${count} type errors, baseline is ${baseline}: run 'npm run typecheck -- --update' to lock in the gain` };
  return { ok: true, message: `${count} type errors (baseline ${baseline})` };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tsc = spawnSync('npx', ['tsc', '-p', 'tsconfig.json'], { encoding: 'utf8' });
  const output = `${tsc.stdout}${tsc.stderr}`;
  if (tsc.error || (tsc.status !== 0 && !output.includes('error TS'))) {
    console.error(`tsc failed to run:\n${tsc.error || output}`);
    process.exit(2);
  }
  const count = countErrors(output);
  if (process.argv.includes('--update')) {
    writeFileSync(BASELINE_FILE, `${count}\n`);
    console.log(`baseline set to ${count}`);
  } else {
    const baseline = Number.parseInt(readFileSync(BASELINE_FILE, 'utf8'), 10);
    const result = evaluate(count, baseline);
    if (!result.ok) console.error(output);
    (result.ok ? console.log : console.error)(result.message);
    process.exit(result.ok ? 0 : 1);
  }
}
