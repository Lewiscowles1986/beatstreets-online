# JUDGE — 009-enemy-ai-reengagement

## Verdict
- ACCEPT_WITH_CONDITIONS — the actual re-engagement root causes were found and fixed (verified line-level), parity is proven to draw 190, and the integrity violation was reverted; the remaining post-hit state-branch gap honestly keeps the action gates informational.

## Authoritative assessment
- Engine fixes verified against vol2/beatstreets/beatstreets.py: scroll_speed = player.x/(WIDTH/4) (L2083); boundary.right = scroll_offset.x + WIDTH-1 (Rect L1980 + L2086); APPROACH_PLAYER randint(0,500) back-off with target.x -= facing*90, GO_TO_POS (L1019-1025). All three match the web changes exactly.
- timer-254 live-frame mapping restored; confirmed against the driver's _schedule/gameplay_frames semantics (008's 255 was wrong); stage gate unaffected (idle player).
- action-parity.test.ts (4 green) asserts real prefixes against committed python --trace-rng fixtures (ctor 85 draws; first 190 draws) — not tautologies. Verified first divergence at draw 190 (hero-punch): python randint(0,500) approach back-off vs web randint(0,1) fall choice — the post-hit state branch. enemy-attack stays aligned through its window.
- Integrity violation handled: the interrupted builder overwrote e2e/reference/beatstreets-gameplay-stage.png with a non-python file; the orchestrator reverted it; working-tree md5 e0e294bb… matches a fresh driver capture. Documented in MEASUREMENT.md.
- Action gates stay INFORMATIONAL (hero punch 9.22%, enemy attack 8.38%) with the refined blocker — honest given the pinned post-hit gap. All 6 core gates HARD and green; precommit exit 0 (76+39 unit, 10 e2e, action spec in the hook).
- GAP: docs/FIDELITY.md round-008 section was not updated for 009 — it still lists freeze 545/440 and the old "enemy stops attacking" blocker.

## Conditions for acceptance
1. Fix the enemy post-hit state branch (Enemy.update hit/fall handling) so the web draws randint(0,500) approach back-off like python; then flip ALIGNED_PREFIX to a full-stream assertion and promote both action gates to HARD on aligned metrics.
2. Update docs/FIDELITY.md round-008 section: corrected freeze 544/439, the refined post-hit blocker, the action-parity test, and the informational status.
3. Validate .github/workflows/fidelity.yml on the next real push.

## Polished state
- Engine now matches python on scroll speed, boundary-rect movement, and approach back-off — the actual re-engagement root causes.
- RNG streams agree for 190 draws across both action schedules; the first divergence is named (post-hit state branch).
- Stage reference integrity restored and md5-verified; action references unchanged/authentic.
- Precommit green with the action spec in the hook; action gates honestly informational pending the state-machine fix.
