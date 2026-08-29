# Round 025 — Critic

## Review of the hard-inert guard

1. **Fidelity check**: the guard `lives <= 0` cannot change reproducible python
   behaviour — in python, an out-of-lives fighter is in FALLING (rejected by the fall
   guard anyway) or is the portal at the exact removal instant, and the one-punch
   corpse-reset is a bug class python also has but only under that cheat. Verified:
   every fidelity HARD gate reproduced unchanged; the seeded weapon trace (the 023
   bit-exactness baseline) still passes because the kill/removal path is untouched.
2. **The dead-AI early-out** skips the enemy's switch BEFORE the state machine. The
   dying fall's movement lives in Fighter.update (unchanged); the knockdown-last-frame
   animation comes from determineSprite (state-based, still fine for the death anim).
   Removal timing tests still pass (230-250 frames).
3. **The portal nuance**: hard-inert makes the exploding portal immune 50 frames
   earlier than python (which lets hits land until the list removal). This is a
   deliberate divergence by user rule, invisible in normal play (the player is rarely
   attacking the explosion), and covered by the user's instruction. Flagged so the
   judge owns it.
4. **Tests are honest**: the barrage test distinguishes "the hit changed something"
   from "the death anim moved" by snapshotting around each hit.

## Verdict

Approve, with the noted 1-frame portal divergence intentional under the user rule.