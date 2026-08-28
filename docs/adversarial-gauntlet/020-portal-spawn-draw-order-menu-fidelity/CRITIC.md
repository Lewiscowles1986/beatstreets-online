# Round 020 — CRITIC

## Verified against the code and the python ground truth

1. **Portal rewrite** — checked line-by-line against `EnemyPortal` (beatstreets.py
   1384-1495): ctor stats (health 15, anchor_y 340, half_hit_area 50×50,
   hit_sound portal_hit, score 10, default speed/stamina), PAUSE→grow→PORTAL via
   `make_decision`, two-phase spawn (`choice` at generate start, colour variant
   drawn at the enemy's construction inside the seeded stream, `spawn_facing`
   0=left/1=right from `portal.x > player.x`, frame reset, `portal_enemy_spawn`,
   actual level insertion 96 frames later via append + `spawned()`), interval
   growth `min(interval + change, max_spawn_interval)` after each ACTUAL spawn,
   `len(game.enemies) >= max_enemies` → 60-frame retry (total enemies, not other
   portals), PORTAL_EXPLODE at health<=0 with `frame>50` life loss,
   `overrideWalking` so the Fighter standing branch never runs, and the full
   determineSprite ladder (grow/destroyed/generate neutral+enemy-specific/hit/
   idle). The portal's `frame += 1` happens BEFORE the state logic, matching
   python's line 1429, and `super.update()` runs last.
   - Confirmed the portal Character is synthesized (`PORTAL_CHARACTER`) — python
     has no characters.json entry for it; `buildEnemy`'s null return can no longer
     silently drop it.
   - Probe: stage 15 → EnemyPortal in PAUSE, then PORTAL (state 6); after 600
     updates an EnemyVax at (8530, 400) — 370px on the portal's left, spawn_facing
     0 correct for a player at x=400.
2. **Draw order** — the single sorted list now includes scooters (offset −1) and
   powerups (0); python's offsets (Player +1, Barrel +2, BreakableWeapon −50)
   unchanged. The lone-scooter anchor fixed to `['center', 256]` (python's
   ScrollHeightActor anchor) — the previous bottom anchor drew the 320px bike
   64px too low. This is a real fidelity bug fixed in passing, not part of the
   report, and it cannot regress the stage/action gates (no scooter appears in
   any gate window — verified: no scooter reference in e2e).
3. **Screen fidelity** — GameOverScreen now blits `status_win`/`status_lose` at
   (0,0) over black exactly like `gameover-entry.tsx` (gate-verified 0.00% both
   ways); the invented score/prompt render is gone. Menus are opaque black —
   consistent with CONTROLS (`screen.fill(black)`) and the opaque status bitmaps.
   Verified visually in the storybook captures (scene-pause.png).
4. **Storybook controls** — StageView stories take a 1-29 stage knob with a render
   fn resolving the stage object; scroll knob to 20500 covers the widest stage.
   The GameCanvas story file (missing since 140b053 registered its screenshot ids)
   is restored with four frozen stories — the two long-broken screenshot gates
   pass again.

## Criticisms (fixed in this round)

- **The auto-skip port had a second latent bug**: `ScheduledControls` was only
  installed when a press/hold schedule existed, so `scheduled?.press(0)` was a
  silent no-op on plain `?skip=1` URLs — the intro teletype ran to completion and
  `?place=` was deferred by ~11s. Now always installed.
- **The cheat gates' live-play predicate was wrong for the new skip semantics**:
  `timer >= 255` fires mid-teletype (pre-skip). Fixed with the `data-text-active`
  harness attr; all six cheat gates pass again.

## Residual (honest)

- The three weapon gates sit at 8.88/8.88/8.62% vs the ≤1.5% HARD threshold. The
  round-020 root cause (skip RNG) is closed — the stream matches python through
  draw 183 (the entire intro + the first enemy decision). The residual divergence
  begins at the enemy-AI `make_decision`/`determine_attack` draws (python trace
  i=184+) and is the 013-documented hit/fall ±2-frame choreography item. It needs
  the driver's per-frame playerstate rows (or a fresh instrumented python run) to
  pin; it is not a regression from this round.
- `Scooter.colourVariant` falls back to 0 when knocked off a variant-less rider —
  matches python's `randint(0,2)` draw at the scooterboy ctor (the variant is
  always drawn), so no RNG divergence.

Verdict: all four user-reported issues are implemented and verified; the carried
skip fix is ported with one extra latent bug found and fixed; gate regressions:
none.