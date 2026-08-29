# Round 026 — Builder: one-hit mode kills portals too

## User report

"portals should also die from one-hit in one-hit mode"

## Cause

`attack()`'s ONE PUNCH post-hit block explicitly excluded the portal
(`!opponent.isPortal()`), so in one-hit mode the portal took normal chip damage
(health 15 - punch strength per landing hit) and needed many hits.

## Fix

The one-punch block now covers every live enemy. For portals it zeroes health WITHOUT
the fall path (python's knockdown explicitly excludes EnemyPortal, and the exploding
portal must stay STANDING): the zeroed health makes the portal's own update enter
PORTAL_EXPLODE on its next tick, which then runs out ~50 frames and is removed exactly
as before. Regular enemies' one-hit behaviour is untouched (also covered by a
regression test).

## Verification

`src/game/onehit-portal.test.ts`: one punch → health ≤ 0, no fall, PORTAL_EXPLODE
reached after the portal's PAUSE timer, removal after the ~50-frame explosion; plus a
regular-enemy one-hit regression check. Full precommit green; weapon gates reproduced
at 0.67/0.69/0.73% (cheat behaviour is not captured by the seeded python-parallel
fidelity paths, so no gate drift).