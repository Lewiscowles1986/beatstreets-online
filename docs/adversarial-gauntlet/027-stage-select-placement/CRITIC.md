# Round 027 — Critic

## Review of the placement + camera changes

1. **Placement is data-driven per stage**: the first stage enemy's x is the
   deterministic specific X — every stage's sandbox/stage-select now spawns the
   character in front of its OWN action; no per-stage table to drift.
2. **The three-path split is explicit**: the explicit `place` > the driver-parity
   default (400,400, no camera warp — the capture harness's bit-exactness contract
   depends on it) > the cheat/sandbox default (per-stage X + camera warp). Verified:
   the seeded weapon parity suites still pass unchanged; every gate reproduced.
3. **The camera warp only fires on the cheat/sandbox path** (`place` or no
   resetTimer arg) — the harness path is untouched, so the capture parity is
   preserved and the storybook/user jumps snap to the action.
4. **The world-refresh nuance is now a first-class citizen**: the scroll trigger's
   one-time refresh re-fires when a jump lands past the boundary (python's pipeline
   behaves the same way); the tests that attach extra actors re-attach across it and
   detect real removal by the lives flag.
5. **Honesty note accepted**: the earlier sandbox claim was verified late-in-the-rush;
   this round's evidence is fresh-load.

## Verdict

Approve.