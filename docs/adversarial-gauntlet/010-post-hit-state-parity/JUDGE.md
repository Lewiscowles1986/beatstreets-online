# JUDGE — 010-post-hit-state-parity
## Verdict
- ACCEPT — both mechanical bugs fixed and verified line-level vs python; full-stream RNG parity proven; both action gates HARD ≤1.5% and green; no regressions.
## Authoritative assessment
- Hit-frame fix (fighter.ts:271): `hitFrames.includes(attackFrame)` mirrors python line 598 `frame in self.last_attack.hit_frames` (VALUE membership); `frameAt` matches python `get_attack_frame` (813-816). The old `in`-on-array checked INDICES, landing every hit on frame 0 — confirmed root cause of the 009 divergence.
- Draw-order fix (GameCanvas.tsx:490): sort by `vpos.y + getDrawOrderOffset()` mirrors python line 2131; Player offset +1 (player.ts:29) matches python `Player.get_draw_order_offset`. Same-Y enemies no longer render over the hero.
- Full-stream parity: action-parity.test.ts asserts `web.slice(0, py.length) == py` for BOTH schedules (describe.each); `web.length ≥ py.length`; ≤2 freeze-boundary draws excluded by comparing to the python stream length, documented. Traces authentic (200/195 draws, unchanged in tree).
- HARD promotion: e2e/fidelity-action.spec.ts gates HARD ≤1.5% (`MAX_ACTION_DIFF_FRACTION=0.015`), derivation documented (measured + headroom, same as stage gate). Verified live: enemyattack 0.72%, heropunch 0.80% — both pass.
- No regressions: 6 core gates green (title 0.01 / intro 0.00 / stage 0.73 / controls 0.00 / win 0.00 / lose 0.00); 76 engine + 39 web unit tests pass; typecheck + lint (0 errors) pass; e2e action + fidelity + game-canvas pass.
- Unit-test corrections honest: no-scroll zone (player < WIDTH-300=500) avoids per-frame `createStageObjects`; ONE PUNCH now asserts real knock-out (health 0 + FALLING) + despawn timing (frame>240), no longer passing virtually.
## Conditions for acceptance
- None blocking. Carry-forward (orchestrator, next real push): validate `.github/workflows/fidelity.yml` in CI.
## Polished state
- Combat simulation bit-exact with python (full randint stream, both schedules); action gates promoted to HARD at the stage dithering baseline.
- Two real engine bugs closed (frame-0 hit, draw-order offset); three tests de-pinned from the old behaviour.
- All 6 core gates + 2 action gates green; precommit-equivalent verified (typecheck, lint, 115 unit, 10 e2e).
- Docs (FIDELITY.md, MEASUREMENT.md, BUILDER.md) updated; tree ready for orchestrator commit.
