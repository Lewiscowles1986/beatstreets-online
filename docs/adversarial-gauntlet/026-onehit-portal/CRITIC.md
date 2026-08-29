# Round 026 — Critic

## Review

1. **Cheat-only surface**: one-punch is a web cheat (no python counterpart), so the
   user defines its behaviour; there is no fidelity-gate interaction (the cheat is
   never enabled in the seeded captures). Confirmed: all gates reproduced unchanged.
2. **The portal branch is python-correct in shape**: python's hit excludes EnemyPortal
   from the knockdown (`not isinstance(self, EnemyPortal)`), and the portal's own
   update transitions PORTAL → PORTAL_EXPLODE on health <= 0. The one-hit zero walks
   the SAME transition the normal path uses — no invented states.
3. **Interaction with 025's hard-inert rule**: the portal's lives stay 1 until the
   explosion completes, so hits during the explosion still land (harmless: state is
   no longer PORTAL, so the explosion cannot re-trigger). The dead-guard for the
   post-explosion corpse (lives = 0) is upstream in the same `lives > 0` condition.
4. **Tests**: the portal test drives the REAL attack path (the one-punch block lives
   in attack(), not hit()) and accounts for the portal's spawn-PAUSE timer before the
   explosion state appears. The enemy regression check pins the pre-existing
   behaviour.

## Verdict

Approve.