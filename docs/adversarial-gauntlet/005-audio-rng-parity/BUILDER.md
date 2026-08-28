# BUILDER — 005-audio-rng-parity

## Changed per-file

- `tools/capture_beatstreets_frame.py` (parent repo): added `--trace-rng`, which wraps
  the game module's `randint`/`choice` to print one line per draw (`frame, index, site,
  args, value`). Default off; does not change default behaviour or the captured frame.
- `packages/engine/src/core/prng.ts`: added `TracingRng` — a pass-through RNG wrapper
  that records every draw (`kind`, `args`, `value`, `frame`) for draw-parity traces.
- `packages/engine/src/engine/game.ts`:
  - `playSound(name, variants)` now consumes `randint(0, variants-1)` from `game.rng`
    (G1), mirroring Python `get_sound`. Draws for EVERY sound including count-1, and is
    decoupled from playback (selection happens even when audio is muted/unavailable).
  - Added `preDrawWorldRng()` — drawn in the ctor BEFORE the stolen-item choice (G3):
    iterates every stage in order, drawing `randint(0,2)` colour_variant for each
    colour-bearing enemy (vax/hoodie/scooterboy/boss) and Stick/Chain durability,
    matching Python's `setup_stages()`. Lazily-built stages reuse these pre-drawn values
    (no re-draw).
  - Added `opts.debugRng` → `game.rngTrace` (a `TracingRng`); `update()` tags each draw
    with the current game timer frame.
- `packages/engine/src/engine/enemies.ts`: EnemyVax/Hoodie/Scooterboy/Boss now accept a
  pre-drawn `colourVariant` in opts (falling back to a live draw for portal spawns, as
  Python does at spawn). EnemyBoss now draws a colour_variant too (previously missing).
- `packages/engine/src/engine/weapons.ts`: Stick/Chain accept an optional pre-drawn
  durability (falling back to a live draw).
- `src/game/sound-parity.test.ts` (new): G1 decoupling + count semantics; G2 real
  constructor bit-parity vs the Python trace (85 draws at seed 1); G3 pre-drawn-colour
  reuse; G4 capture-schedule web count (85 vs python 184) + live-combat sound draws.
- `e2e/fidelity.spec.ts`: stage comment updated to the 005 state (world-setup parity
  achieved; frame-flow blocker remains); stage gate stays INFORMATIONAL.
- `docs/FIDELITY.md` (§4 rewritten with audio parity + trace workflow),
  `docs/adversarial-gauntlet/005-audio-rng-parity/MEASUREMENT.md` (new),
  `BUILDER.md` (this file).

## Verification

- `npm run test:engine` — 76 passed.
- `npm test` — 76 engine + 35 web (incl. 6 new sound-parity), all green.
- `npm run typecheck` + `npm run lint` — clean (one pre-existing warning in GameCanvas).
- `npm run build` + `npx playwright test --project=chromium e2e/fidelity.spec.ts` —
  title 0.10% (HARD ≤1%), intro 7.82% (informational), stage 3.53% (informational).
- `npm run precommit` — one run, green (typecheck, lint, test, build, fidelity + game-canvas e2e).

## Fidelity notes

- The web constructor now consumes the EXACT 85 world-setup draws Python does at seed 1
  (83 colour + 1 Stick + 1 stolen choice), asserted bit-for-bit in `sound-parity.test.ts`.
- Sound-variant selection is routed through `game.rng` (G1) and is decoupled from
  playback; the draw happens even when no audio context is available.
- The stage state is still NOT bit-aligned: the web reaches 85 draws at the freeze point
  vs Python's 184. The residual 99 draws are the intro-text teletype + 255-frame fade +
  fade/early-combat sounds Python runs but the web's `jumpToStage` skips (frame-flow
  divergence), plus the GameCanvas Host builds the Game twice. This is the precise
  blocker; the metric (3.53%) did not drop and remains a structural artifact.
- Per G4's contract (states not aligned), the stage gate stays INFORMATIONAL rather than
  a loose hard threshold. Title 0.10% ≤1% green; intro 7.82% informational.

## Handoff

- Uncommitted tree ready for orchestrator commit. Do not edit GOAL.md.
- No reference PNG was regenerated (web/python stage-1 configs unchanged; alignment not
  achieved). The committed `beatstreets-gameplay-stage.png` still matches the current
  Python build.
- Next round: replay the intro text + 255-frame fade through the real menu flow instead
  of `jumpToStage` (and build the Game once in GameCanvas) so the web consumes Python's
  99 intro/fade sound draws and its RNG stream reaches the same position — the remaining
  step to a hard stage gate.

## Critic fixes applied
- Draw attribution corrected with trace-derived split: python 184 = 85 ctor + 99
  intro/fade sounds + 51 live-combat variants (web's first attack lands outside its
  345-frame window); MEASUREMENT.md updated.
- Documented: web engine does not yet implement the 255-frame fade overlay — scoped
  for the next round (or an equivalent timed window) before bit-alignment is possible.
- Qualified: Host's double Game build is RNG-harmless (discarded instance's draws are
  never read); sound-parity test is engine-model parity, not the real capture path.
