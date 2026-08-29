# Round 026 — Critic (addendum B): portal spawn pacing

## Review

1. **Evidence-based default change**: python's `max_spawn_interval=600` is a
   constructor literal (beatstreets.py 1389); stages 26/29 rely on it. The web's 250
   was an invented default. All explicit-cap stages are untouched (verified: the
   fixture with max 250 still bounds the growth).
2. **The audit ruled out the obvious suspects** — same spawn cadence, same generate
   window, same too-many retry, and identical per-stage args — documented so the
   judge knows the fix is the ONLY divergence found.
3. **The pacing test drives the real update loop** (portal spawns, the player's hit()
   clears fresh spawns), with the portal itself excluded from the clearing (a prior
   run accidentally killed it — hit() correctly reduced the portal's health and it
   exploded, which stalled the growth; the final test skips EnemyPortal).
4. **Gate-neutral**: portal pacing is a data/behaviour change never captured by the
   seeded python-parallel fidelity paths (no portal stages in the gate set).

## Verdict

Approve.