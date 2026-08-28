# BUILDER — 008-maintenance-loop-action-breadth

## Changed per-file

- `tools/capture_beatstreets_frame.py` (parent repo): added `--press FRAME:BUTTON`
  (repeatable) and `--hold DIR:FROM:TO` (repeatable) — a deterministic action schedule
  indexed in live-gameplay space (frame 0 = first frame after the intro fade, game
  timer 255). The schedule only applies during live gameplay (not the intro/fade), so
  the player never moves/attacks before the fade completes. Default captures unchanged.
- `src/stage-entry.tsx`: reads `?press=`/`?hold=` (comma-separated schedule) and passes
  them to `GameCanvas`.
- `src/components/GameCanvas.tsx`: new `pressSchedule`/`holdSchedule` props; `Host`
  wraps its controls in a `ScheduledControls` that injects presses/holds at the exact
  live frames (set before each play tick), mirroring the driver's schedule.
- `e2e/fidelity-action.spec.ts` (new): two INFORMATIONAL action gates (enemy attack,
  hero punch) that replay the schedule and assert only a structural bound; writes
  `e2e/screenshots/fidelity-action-metrics.json`.
- `e2e/fidelity.spec.ts`: writes `e2e/screenshots/fidelity-metrics.json` (metric table)
  via `afterAll`.
- `e2e/reference/`: added `beatstreets-action-enemyattack.png`,
  `beatstreets-action-heropunch.png` (md5s in MEASUREMENT.md).
- `scripts/fidelity.mjs` (new) + `package.json` `fidelity` script: the maintenance loop.
- `Makefile` (parent repo): `fidelity` target.
- `.github/workflows/fidelity.yml` (new): CI fidelity gate.
- `docs/FIDELITY.md` (§0 maintenance loop + CI, §4 action frames),
  `docs/adversarial-gauntlet/008-.../MEASUREMENT.md` (new), `BUILDER.md` (this file).

## Verification

- `npm run fidelity` — end-to-end green: all references unchanged, build ok, all gates
  green, metric table printed.
- `npm test` — green.
- `npm run precommit` — one run, green (exit 0).

## Fidelity notes

- Action frames are INFORMATIONAL: the web's combat RNG diverges from Python's (the
  web's enemy AI stops attacking after its first attack; Python's re-engages). Measured
  diff ~8% vs 0.7% for the idle stage. The gate logs the diff + trace-derived blocker
  and asserts only a structural bound. See MEASUREMENT.md.
- The idle-stage gate (0.73% HARD) and all static gates are unchanged.

## Handoff

- Uncommitted tree ready for orchestrator commit. Do not edit GOAL.md.
- New reference PNGs added (md5s in MEASUREMENT.md); existing references unchanged.
- CI workflow committed but untested-in-CI (no GitHub runner in this sandbox); validated
  locally by running the same commands.

## Critic fixes applied
- setLiveFrame off-by-one fixed (timer - 254 → timer - 255; the intro/fade consumes
  255 frames, so live frame 0 == timer 255). All 6 core gates re-verified green;
  action captures re-run (metrics unchanged at 9.22%/8.37% — schedule semantics
  corrected, combat state unchanged within the captured window).
- Title-compensation comment/naming updated for the SDL-dummy reference (the cocoa
  rationale was stale); compensation region now nearly empty after the 008 gamma
  strip but still required for the glow region (0.01%).
