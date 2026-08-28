# JUDGE — 008-maintenance-loop-action-breadth

## Verdict
- ACCEPT_WITH_CONDITIONS — all gates green, maintenance loop + CI wired, action gates honestly informational with a documented real gameplay-logic divergence; only a minor doc contradiction and the known enemy-AI bug remain.

## Authoritative assessment
- Critic item 1 (setLiveFrame off-by-one) FIXED: `GameCanvas.tsx:274` now uses `timer - 255`, matching the driver's live-frame-0 == timer-255 contract; freeze alignment verified (web freezes at timer 545/440 == driver frames-to-play 290/185 + 255).
- Critic item 2 (title-compensation comment) UPDATED to the SDL-dummy reference; `beatstreets-title.png` (326840 B) is distinct from the cocoa capture (363417 B), confirming the swap; gate passes 0.01% HARD.
- Maintenance loop verified: `package.json` `fidelity` → `scripts/fidelity.mjs` (temp-dir regen, md5-compare, copy-on-change, build, gates, metric cat); parent `Makefile` `fidelity` target present; `.github/workflows/fidelity.yml` committed (push/PR, npm ci+cache, chromium workers=1, artifact upload on failure), honestly marked untested-in-CI.
- G1–G5 met: one-command loop works end-to-end; CI workflow committed; action breadth (2 frames) captured via driver `--press`/`--hold` and replayed through `stage.html?press=&hold=&freeze=`; no regressions (title 0.01 / intro 0 / stage 0.73 / controls 0 / gameover 0 all HARD; metrics JSONs match MEASUREMENT.md); FIDELITY.md + 008 docs present.
- Action gates left INFORMATIONAL is the RIGHT call: the web enemy AI stops re-engaging after its first attack (16 `determine_attack` draws vs Python's 111) — a genuine gameplay-logic divergence, not a render bug. Structural bound (≤50%) still catches blank/missing scenes.
- Residual doc nit: `e2e/fidelity.spec.ts` header says the SDL-dummy capture "flattens the logo's glow like the cocoa capture", contradicting MEASUREMENT.md (SDL-dummy is closer to the raw blit, hence the near-empty compensation region). Prose only; logic and gate unaffected.

## Conditions for acceptance
1. Fix the web enemy-AI re-engagement divergence (Python re-attacks the idle player; web stops) — the clear fidelity bug — then promote the two action gates to HARD once the RNG trace proves bit-alignment.
2. Reconcile the title-compensation comment in `e2e/fidelity.spec.ts` with MEASUREMENT.md (SDL-dummy does NOT flatten the glow like cocoa).
3. Validate `.github/workflows/fidelity.yml` on the next real push (it is committed but untested-in-CI).

## Polished state
- One-command fidelity maintenance loop (`npm run fidelity` / `make fidelity`) regenerates references with md5-diff reporting, builds, runs all gates, prints the metric table.
- CI fidelity workflow committed; action-breadth gates (enemy-attack 8.37%, hero-punch 9.22%) replay deterministic schedules and are honestly informational with the trace-derived blocker documented.
- All 6 core gates HARD-green; precommit exit 0; uncommitted tree ready for orchestrator commit.
