# BUILDER — 014 weapon-stream alignment

## Root cause found: the web replay never held LEFT

The weapon-schedule replay built its controls as `ScheduledControls(-4, null)` —
holdTo = -4 means getX() is ALWAYS 0, so the hero faced RIGHT (the engine default
facingX = 1) for the entire fight. Python's driver `--hold left:0:4` faces the hero
LEFT from live 0. Every downstream difference (the fight hoodie's timing, the
knockdown positions, the ±2-frame shifts analysed in 012/013) flows from the replay
harness, not the engine.

## Fix + measured result

- `ScheduledControls` gains a `holdDir` (1 | -1, default 1); the weapon replay now
  constructs `new ScheduledControls(4, null, -1)` — the exact counterpart of
  `--hold left:0:4`.
- The weapon parity test is UN-SKIPPED. With the fix the web replay's randint
  stream matches python for the first **352 draws** (previously 302), including the
  whole fight through the hoodie's death approach.
- The remaining delta (draws 352-354): the fight hoodie's OWN punch cascade runs
  ±2 frames later in the web (its stamina drains to the knockdown via its own
  special-attack cost; python's fall lands at live 224, the web's at 226), so
  python's `randint(0,2)` stick-drop roll at draw 352 arrives at web draw 354 —
  one frame past the freeze boundary (the replay mirrors the capture at timer 926).

## New defect discovered: the hoodie's stick drop is not implemented

Python's `EnemyHoodie.died()` rolls `randint(0, 2) == 0` and appends a
`Stick(self.vpos)` (beatstreets.py line 1242). The web's `EnemyHoodie` has NO
`died()` override (`Fighter.died()` is an empty hook) — the stick can never drop.
The 015 round implements it (drop roll + `randint(12, 16)` durability) and chases
the ±2 hoodie-cadence delta with per-frame playerstate probes.

## Harness corrections this round

- The 012/013 frame-offset analysis corrected (offset 724, not 679) — recorded in
  the 012 BUILDER doc (commit e72584b).
- The repo was found checked out on `main` twice by an external actor (a PR merge
  brought an early branch state into main without the gauntlet rounds). All round
  work lives on `ci/fix-canvas-sizing-flake` (local ref e72584b+); this round's
  commits continue there.

---
# CRITIC — 014

The round's central claim is verifiable and verified: the replay harness — not the
engine — caused the fight divergence, proven by the stream lengthening from 302 to
352 matching draws after a one-line harness fix. The un-skip is justified by the
measured prefix (352/354, first mismatch precisely identified as the stick-drop
roll arriving 2 frames late), and the assertion documents the freeze-boundary trail
honestly rather than weakening the comparison. The newly-discovered missing
`died()` override is a REAL gameplay gap (the stick can never drop in the web port)
and is correctly queued as the 015 opening item. No gate inflation: the pixel gates
stay skipped until the stream is fully exact.

---
# JUDGE — 014 verdict: ACCEPT (major diagnostic progress, honest partial)

- The harness root cause (missing left hold) is a genuine bug with a clean fix; the
  evidence (302 -> 352 matching draws) is decisive.
- The weapon parity test is now ACTIVE and asserting a 352-draw exact prefix — the
  strongest bit-parity evidence yet for combat behaviour.
- Carry-forward to 015: (1) implement EnemyHoodie.died() stick drop
  (randint(0,2)==0 + randint(12,16) durability), (2) chase the ±2 hoodie
  own-punch-cadence delta, (3) then un-skip the three weapon pixel gates,
  (4) validate .github/workflows/fidelity.yml on the next real push (carried since
  008), (5) note: main now contains an early PR merge; the branch remains the
  canonical line and should be kept rebased and eventually re-PR'd.
