# Round 020 — BUILDER: portals, scooter draw order, screen fidelity, storybook knobs

## Objective (user-reported issues)

1. **Portals don't behave as in the original game** — verify and fix.
2. **Motorcycles paint over the character** when separated from their rider.
3. **A-menu pattern has no visual fidelity** with the you-lose / you-win screens.
4. **Storybook loads all levels, not just the stages named** — the stage stories must
   expose controls so people can experiment.

Plus the carried 020 item: port the verified intro-skip RNG fix into the production
harness (weapon-gate root cause).

## Root causes (all four confirmed before coding)

### 1. Portals never existed in the web build

`Game.buildEnemy` resolved every enemy through `characters.json`
(`characters[name.toLowerCase().replace('enemy','')]`), which holds only
`vax/hoodie/scooterboy/boss` — `'portal'` → `null` → **`EnemyPortal` was never
constructed** (probe: stage 15 `getEnemies()` empty after 600 updates). The old
`EnemyPortal` class was also structurally wrong: it set `state = PORTAL` in the
constructor (skipping the PAUSE/grow animation), spawned instantly with no two-phase
generate animation, counted only other portals against `maxEnemies` (python counts
**total** enemies), applied the interval change with an inverted `Math.max` clamp,
had no `PORTAL_EXPLODE` death, played none of the four portal sounds, never called
`super.update()` (frame/hitTimer never advanced), and had no `determineSprite`.

Python ground truth (`EnemyPortal`, beatstreets.py 1384-1495):

- ctor defaults NOT from characters.json: health 15, speed (1,1), stamina 500,
  anchor_y 340, half_hit_area (50,50), hit_sound "portal_hit", score 10.
- starts in PAUSE for `start_timer` (90) — `portal_grow_0..3` plays via the PAUSE
  sprite branch — then `make_decision()` → `state = PORTAL`.
- two-phase spawn: at `spawn_timer <= GENERATE_ANIMATION_TIME (96)` it draws
  `choice(spawns)` + the enemy ctor's own `randint(0,2)` colour variant, faces the
  player (`spawn_facing = 0 if portal.x > player.x else 1`), resets `frame`, plays
  `portal_enemy_spawn`, and only ADDS the enemy to the level 96 frames later
  (`spawn_enemy` = append + `spawned()` → `portal_appear`).
- `spawn_interval += spawn_interval_change` capped at `max_spawn_interval` after each
  actual spawn (spawns get LESS frequent); `len(game.enemies) >= max_enemies` →
  retry in 60 frames.
- death: health <= 0 → PORTAL_EXPLODE (frame 0, `portal_destroyed`), frame > 50 →
  life lost, removed by the game loop.
- `override_walking()` → True (the Fighter standing branch never runs; the portal's
  own `frame += 1` drives every animation).
- sprites: PAUSE&&frame//8<4 → `portal_grow_min(frame//8,3)`; PORTAL_EXPLODE →
  `portal_destroyed_min(frame//6,7)`; generating → `portal_generate_0..2` then
  `portal_generate_<enemy.sprite>_<facing>_<min(frame//16-3,2)>_<variant>`;
  hit → `portal_hit_0`; else `portal_idle_(frame//8)%8`. All 90 sprite variants
  exist in the asset set (verified).

### 2. Scooters painted over characters — a separate draw pass

Python draws ONE sorted world list `[player] + enemies + weapons + scooters +
powerups` by `vpos.y + get_draw_order_offset()` (Player +1, Barrel +2,
BreakableWeapon −50, **Scooter −1**). The web sorted only
`[player, ...enemies, ...weapons]` and drew scooters in a separate pass afterwards —
always on top. The lone `Scooter` also used the default bottom anchor; python blits
it with anchor `("center", 256)` (ScrollHeightActor, height_above_ground 0).

### 3. Menu / win-lose fidelity — invented UI over a translucent dim

- `GameOverScreen` drew invented text ("YOU WIN!", score, prompt); python's GAME_OVER
  blits the fully-opaque 800×480 `status_win`/`status_lose` bitmap centred (which
  lands at (0,0)) over the black-cleared base — nothing else.
- `MenuOverlay`/`CheatOverlay` painted `rgba(0,0,0,0.7)` over the frozen world;
  python's fullscreen screens are opaque (CONTROLS = `screen.fill(black)` + blit).

### 4. StageView stories hard-coded stages

Three stories indexed `stages.stages[0]/[3]/[14]` with only scroll/debug knobs and a
scroll cap of 4000 (unreachable for late stages). `StageList`/`PlayableStage` already
had controls.

### Carried item: intro-skip RNG fix ported

The round-020 root cause: the harness auto-skip pressed at timer 1, so the ~99
per-character teletype `randint(0,0)` draws never happened, and the whole seeded
stream diverged from python (which skips only after the text fully displays). Two
production bugs were also found while porting:

- `ScheduledControls` (the wrapper that carries the auto-skip press) was only
  installed when a press/hold schedule existed — on plain `?skip=1` URLs
  `scheduled?.press(0)` was a silent no-op, so the intro teletype ran to completion
  and any `?place=` placement was deferred by the full text duration.
- The skip condition itself now presses when
  `displayedText.length >= currentText.length` (python driver parity), consuming the
  teletype draws.

## Changes

- `packages/engine/src/dsl/characters.ts`: `hit_sound` field (python Fighter
  hit_sound — the portal).
- `packages/engine/src/engine/enemy.ts`: pass `char.hit_sound` to the Fighter base;
  `player()` private → protected (portal needs it).
- `packages/engine/src/engine/enemies.ts`: `EnemyPortal` rewritten python-exactly
  (PAUSE/grow → PORTAL, two-phase generate with live colour variant at construct
  time, spawn_facing, total-enemy maxEnemies check, interval growth clamp,
  PORTAL_EXPLODE death, all four sounds, determineSprite override,
  overrideWalking=True, super.update()); `Scooter.getDrawOrderOffset() = -1`.
- `packages/engine/src/engine/game.ts`: `PORTAL_CHARACTER` (the literal python ctor
  stats — the portal has no characters.json entry); `buildEnemy` uses it for
  `EnemyPortal`; new `createSpawnedEnemy` (draws the colour variant inside the seeded
  stream, python ctor parity) and `spawnEnemyObject` (append + spawned()).
- `packages/engine/src/engine/fighter.ts`: `GameContext` gains
  `createSpawnedEnemy`/`spawnEnemyObject`.
- `packages/engine/src/engine/powerups.ts`: `Powerup.getDrawOrderOffset() = 0`
  (python default) so powerups sort into the one world list.
- `src/components/GameCanvas.tsx`: single sorted draw list
  (player + enemies + weapons + scooters + powerups) mirroring python's painter's
  algorithm; scooter blit anchored `['center', 256]`; ScheduledControls always
  installed; auto-skip waits for the fully-typed intro text.
- `src/components/scenes/GameOverScreen.tsx`: blits `status_win`/`status_lose` at
  (0,0) over black (mirrors `gameover-entry.tsx`, gate-verified at 0.00%); no
  invented text; `score` prop dropped from the render (python doesn't draw it).
- `src/components/scenes/MenuOverlay.tsx` + `CheatOverlay.tsx`: opaque black
  fullscreen (CONTROLS/GAME_OVER language), no translucent dim.
- `src/components/StageView.stories.tsx`: `stage` knob 1-29 + scroll knob to 20500
  via a render fn; named stories kept (1, 4, 14, 15-portal).
- `src/components/GameCanvas.stories.tsx`: created (the 140b053 commit registered
  `game-gamecanvas--*` screenshot ids but never committed the story file — the two
  screenshot gates had been failing on storybook's error display ever since).
  Default/Canvas2D/Debug/LateStage stories freeze the loop deterministically.
- `e2e/screenshots.spec.ts`: game-host stories wait for the game canvas (not the
  sprite-loading placeholder) before capturing.
- `e2e/cheat-navigation.spec.ts` + `e2e/cheat-konami.spec.ts`: live-play wait now
  requires `timer >= 255 && !data-text-active` — the pre-skip text phase also
  crosses timer 255 (the new skip fires at full display, ~timer 730).
- `src/components/GameCanvas.tsx` (harness): new `data-text-active` debug attr.
- `src/game/pickup-probe.test.ts`: removed (scratch probe; findings recorded here).

## Evidence

- Portal probe (engine, seed 1): stage 15 → `[EnemyPortal]` (state 6 = PORTAL after
  the PAUSE); after 600 updates `[EnemyPortal@8900,400, EnemyVax@8530,400]` — the
  Vax spawned 370px to the portal's left, facing the player at x=400 (spawn_facing 0).
- Portal live capture (`stage.html?seed=1&freeze=0&skip=1&stage=15&place=8500:420`):
  the portal renders its idle/generate animation, the spawned enemy walks out and
  engages the player; `portal_appear`/`portal_enemy_spawn`/`portal_hit`/
  `portal_destroyed` assets all wired through `playSound` parity.
- RNG stream: the web trace now matches python for the first **183/184** draws
  (pre-fix the divergence began inside the teletype). The weapon gates improved from
  11.32/10.96/11.15% → **8.88/8.88/8.62%**.
- Gate status: title 0.01%, intro 0.00%, controls 0.00%, stage 0.54%,
  gameover-win/lose 0.00% (all HARD thresholds met); screenshots 22/22; cheat gates
  6/6; app/game-canvas/action suites pass. The three weapon gates remain above the
  1.5% threshold — the residual is the documented 013 hit/fall ±2-frame item, NOT
  the skip (the stream now aligns through the entire intro; the first mismatch is
  the enemy-AI make_decision at python trace i=184, after which the fight
  choreography diverges — the 013 opening item stands).
- Unit suites: engine 82/82, web 41/41; typecheck clean; eslint 0 errors.