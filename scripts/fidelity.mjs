#!/usr/bin/env node
/**
 * Fidelity maintenance loop (GOAL G1).
 *
 * One command that:
 *   1. Regenerates EVERY python reference frame via the capture driver into a temp
 *      dir (tools/capture_beatstreets_frame.py, run with the venv python).
 *   2. Compares each md5 against e2e/reference/ — identical references are kept
 *      silently; changed ones are replaced and the old→new md5 is printed, so a
 *      maintainer sees exactly which references moved after editing the python game.
 *   3. Builds the web bundle and runs the fidelity + orientation playwright gates.
 *   4. Prints the final metric table (the specs write e2e/screenshots/fidelity-*.json,
 *      which this script cats).
 *
 * Usage: `npm run fidelity` (from beatstreets-web). The venv python path is
 * FIDELITY_PYTHON (env override) or ../../.venv/bin/python relative to this repo.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const WEB_ROOT = resolve(__dirname, '..');
const PARENT_ROOT = resolve(WEB_ROOT, '..');
const PYTHON = process.env.FIDELITY_PYTHON || resolve(PARENT_ROOT, '.venv/bin/python');
const DRIVER = resolve(PARENT_ROOT, 'tools/capture_beatstreets_frame.py');
const REF_DIR = resolve(WEB_ROOT, 'e2e/reference');
const SCREENSHOTS = resolve(WEB_ROOT, 'e2e/screenshots');

/**
 * Every reference frame: filename + the driver args that produce it. The driver is
 * run with `--out <temp>/<filename>`; the temp file is then md5-compared to the
 * committed reference.
 */
const REFERENCES = [
  { file: 'beatstreets-title.png', args: ['--state', 'title'] },
  { file: 'beatstreets-gameplay.png', args: ['--state', 'play'] },
  { file: 'beatstreets-gameplay-stage.png', args: ['--state', 'play', '--skip-intro', '--frames-to-play', '90'] },
  { file: 'beatstreets-controls.png', args: ['--state', 'controls'] },
  { file: 'beatstreets-gameover-win.png', args: ['--state', 'gameover', '--result', 'win'] },
  { file: 'beatstreets-gameover-lose.png', args: ['--state', 'gameover', '--result', 'lose'] },
  // Gameplay-action frames (GOAL G3): deterministic --press/--hold schedules.
  { file: 'beatstreets-action-enemyattack.png', args: ['--state', 'play', '--skip-intro', '--frames-to-play', '290', '--hold', 'right:0:290'] },
  { file: 'beatstreets-action-heropunch.png', args: ['--state', 'play', '--skip-intro', '--frames-to-play', '185', '--hold', 'right:0:180', '--press', '180:0'] },
];

function md5(path) {
  return createHash('md5').update(readFileSync(path)).digest('hex');
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: 'inherit', ...opts });
}

function step(msg) {
  console.log(`\n=== ${msg} ===`);
}

// 1. Regenerate all references into a temp dir.
step('Regenerating python references (driver)');
const tmp = mkdtempSync(join(tmpdir(), 'beatstreets-fidelity-'));
const changed = [];
for (const ref of REFERENCES) {
  const out = join(tmp, ref.file);
  run(PYTHON, [DRIVER, ...ref.args, '--out', out]);
  const newMd5 = md5(out);
  const refPath = join(REF_DIR, ref.file);
  if (existsSync(refPath)) {
    const oldMd5 = md5(refPath);
    if (oldMd5 === newMd5) {
      console.log(`  ${ref.file}: unchanged (${newMd5})`);
    } else {
      copyFileSync(out, refPath);
      changed.push({ file: ref.file, old: oldMd5, new: newMd5 });
      console.log(`  ${ref.file}: CHANGED ${oldMd5} -> ${newMd5}`);
    }
  } else {
    copyFileSync(out, refPath);
    changed.push({ file: ref.file, old: '(new)', new: newMd5 });
    console.log(`  ${ref.file}: NEW ${newMd5}`);
  }
}
rmSync(tmp, { recursive: true, force: true });

if (changed.length > 0) {
  console.log('\nReferences changed (commit these with the web change that mirrors them):');
  for (const c of changed) console.log(`  ${c.file}: ${c.old} -> ${c.new}`);
} else {
  console.log('\nAll references unchanged.');
}

// 2. Build the web bundle.
step('Building web bundle');
run('npm', ['run', 'build'], { cwd: WEB_ROOT });

// 3. Run the fidelity + orientation gates (chromium, workers=1 for determinism).
step('Running fidelity + orientation gates');
run(
  'npx',
  ['playwright', 'test', '--project=chromium', '--workers=1', 'e2e/fidelity.spec.ts', 'e2e/fidelity-action.spec.ts', 'e2e/game-canvas.spec.ts'],
  { cwd: WEB_ROOT },
);

// 4. Print the final metric table.
step('Fidelity metric table');
for (const f of ['fidelity-metrics.json', 'fidelity-action-metrics.json']) {
  const p = join(SCREENSHOTS, f);
  if (existsSync(p)) {
    console.log(`\n--- ${f} ---`);
    console.log(readFileSync(p, 'utf8'));
  } else {
    console.log(`\n(no ${f} — gate did not run)`);
  }
}
console.log('\nFidelity maintenance loop complete.');
