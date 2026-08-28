# Round 021 — Critic

## Scope of the fix under review

Two changes: (1) GameCanvas `weaponSprite` now returns null for ANY held weapon
(python blanks every held weapon's image); (2) engine `determineSprite` adds the
weapon-name suffix only in the walk/stand branch, python-exact.

## Checks performed

1. **Python ground truth re-read**: `pick_up` blanks `image` for all weapons
   (`beatstreets.py:1544-1551`); `dropped()` restores per-subclass; the weapon-name
   suffix is inside the walk/stand else only (`beatstreets.py:800`); `hit()` drops the
   weapon (`beatstreets.py:838-840`). The web now mirrors all four.
2. **No other held-weapon draw path**: GameCanvas drawWorld is the single weapon
   renderer (grep clean); the WebGL renderer shares the same draw decisions, and the
   WebGL-vs-2D orientation gate still passes.
3. **Drop paths unaffected**: hit-drop (observed live: the barrel reappears at the
   holder's feet on the punch — python-identical), grab-drop, throw (the barrel roll
   animation resumes via `weaponGroundSprite`).
4. **Sprite families exist**: `hero_walk_barrel`, `hero_walk_stick`, `hero_walk_chain`,
   `hero_pickup_{barrel,stick,chain}`, `hero_throw_barrel`, `hero_attack_{stick,chain}`
   all present under vol2/beatstreets/images; the corrupted names
   (`pickup_*_*`, `hit_*`, `knockdown_*` with a weapon suffix) never existed — the old
   code could only have rendered nothing there.
5. **Duplicate-barrel observation**: the stage create path extending weapons on each
   scroll-start re-trigger is python-faithful (`create_stage_objects` extends, too) —
   not a bug, left alone.
6. **Gate regression check**: `npm run fidelity` weapon gates improved
   8.88→8.46/8.88→8.46 (pickup-anim frames now show the holder); the swing gate is
   unchanged 8.62%. No gate worsened. Fidelity/action/stage/title/intro/menu gates all
   still pass in precommit.

## Verdict

Approve. Both root causes are python-exact fixes, not symptom patches. The residual
weapon-gate gap is the pre-existing 013 choreography item (±2-frame hit/fall), which
this round neither claims to fix nor masks.