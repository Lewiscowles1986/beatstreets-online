# Round 021 — Judge

## Ruling: ACCEPT

## User-facing claim verified

"picking up any object binds it to the characters feet, as well as hands" — resolved:

- A held weapon (barrel included) is no longer drawn at the holder's feet; python blanks
  every held weapon's image and the web now does the same.
- The holder no longer vanishes mid-pickup or when hit while armed (the weapon-name
  suffix no longer corrupts the pickup/hit sprite families); the holder shows the
  authentic weapon-wield sprites (`hero_walk_<weapon>`, `hero_pickup_<weapon>`).

## Evidence accepted

- Deterministic engine probe printing the exact sprite names around the pickup
  (`hero_pickup_barrel_1_0`, then `hero_walk_barrel_1_0` with `held=[true,true]` and
  the draw decision null).
- Live captures showing the hit-drop path unchanged and python-correct.
- Weapon fidelity gates improved (8.88→8.46% on both pickup gates, swing unchanged);
  no other gate regressed; full precommit (typecheck/lint/vitest/build + 10 e2e) green.

## Honest status of the weapon gates

Still 8.46/8.46/8.62% vs the ≤1.5% HARD threshold. The residual is the 013-documented
±2-frame hit/fall choreography divergence (the hoodie's stick connects at a slightly
different frame in the web replay), not held-weapon rendering. It stays the opening item
for the next round via the python-driver playerstate-trace plan.

## Next round (022)

Weapon gates ≤1.5%: replay the stage-5 weapon schedule through a python driver capture
of per-frame playerstate rows to pin the exact frame where the choreography diverges,
then align the web's hit/fall frame accounting.