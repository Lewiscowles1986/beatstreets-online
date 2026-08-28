# CRITIC — 008-maintenance-loop-action-breadth
## Verdict
- ACCEPT_WITH_FIXES — the maintenance loop, CI wiring, and action-breadth gates are sound and every reference is authentic, but the web schedule's live-frame mapping is off-by-one vs the driver and the title-compensation rationale is stale after the reference swap.
## Findings
- [LOW] src/components/GameCanvas.tsx: `setLiveFrame(timer - 254)` contradicts the documented contract (frame 0 = timer 255) and the driver's counter, so the web schedule is shifted +1 vs Python — the press at 180 lands one frame late and the hold stops one frame early at the freeze (web live frame 291 vs driver 289/290 at the captured frame). → use `timer - 255` and re-verify the action captures.
- [LOW] e2e/fidelity.spec.ts: the title per-region compensation is built around the cocoa capture's alpha-flattening, but the reference is now the SDL-dummy capture (no flattening), so the logo reconstruction is redundant and the "cocoa capture" comments/naming are misleading. → update comments/naming or simplify now that the reference is the raw blit.
- [LOW] e2e/fidelity-action.spec.ts: structural bound 0.5 is ~6x the measured ~8%; a partial regression (e.g. 30% diff) passes. → acceptable for an informational gate, but tighten or add a trace-based assertion.
- [INFO] .github/workflows/fidelity.yml: honest (explicitly "not verified in CI"), no trigger conflict with pages.yml (main+dispatch vs all-branches+PR). Minor: no concurrency group; runs on every push to every branch.
- [INFO] Enemy re-engagement blocker is plausible: web makeDecision is structurally aligned with Python make_decision (same 7/10, 2/10, 1/10 branches; game.enemies excludes the player, matching getEnemies().length===1). Root cause is likely in Fighter attack/state handling (recovery/knockdown/hero-hit state), not makeDecision. Flag as the next-round fidelity bug.
## Fidelity assessment
- All references authentic: regenerated title/stage/intro/enemyattack/heropunch all md5-match committed.
- Title swap is genuine SDL-dummy driver output (not a web render); no teach-to-the-test — the driver is python-side only in scripts/fidelity.mjs.
- Auto-replace-on-md5-change is safe: temp-dir + md5-compare + copy-on-change; a failed driver run writes to temp, never corrupts references.
- FIDELITY_PYTHON resolves to code-the-classics/.venv/bin/python; metric JSONs written by the specs and catted by the script.
- vitest: 7 files / 35 tests pass (exit 0); only e2e/reference/beatstreets-title.png changed (git diff --stat confirms).
## Required before judge
1. Fix the off-by-one in setLiveFrame (timer - 254 → timer - 255) and re-verify the action captures.
2. Update the stale title-compensation comment/naming (or simplify) to reflect the SDL-dummy reference.
