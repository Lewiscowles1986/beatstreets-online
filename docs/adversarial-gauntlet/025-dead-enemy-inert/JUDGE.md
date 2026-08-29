# Round 025 — Judge

## Ruling: ACCEPT

Dead enemies are now hard-inert: no damage, no sounds, no facing flips, no knock-on
velocity, no AI decisions — for melee, weapons, the one-punch cheat, and the dying
portal. Removal timing and all seeded fidelity baselines unchanged.

Known intentional divergence: the dying portal is unhittable from health-hit (python:
hittable until its list removal one frame later). Owns to the user's rule "dead
fighters take nothing".

## Standing state

All fidelity HARD gates pass (0.0-0.73%). 2 goal rounds remain in the current window;
no open fidelity items — continue regression guarding + user-reported fixes + the
sync-tooling seam work.