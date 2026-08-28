# BUILDER — 019 frame-stepped verification: Konami cheat + scooterboy sprites

## Report

User: "test the game with a few frames at a time, to ensure that, for example,
the konami code leads to cheat menu; and that you get an opportunity to play the
game, record and see issues, such as the motorbike rider initial frame being off
and when they are knocked off bike that being off."

## Konami -> cheat menu: it was UNREACHABLE via keyboard (3 bugs)

1. **The punch key 'z' was not mapped** — the button map was `0: [' ']` only,
   while the controls screen promises "PUNCH SPACE / Z". Python: punch =
   space/z/lctrl, kick = x/lalt, elbow = c/lshift (beatstreets.py 220-226).
2. **The Konami detector was starved by destructive edge reads.** The keyboard's
   `pressed()` consumed the edge on first read (justPressed.delete) — the
   player's update consumed the punch/kick edges BEFORE handlePlayTokens fed the
   detector, so the 'a'/'b' tokens never arrived. Python's button_pressed is a
   NON-destructive per-frame edge (is_button_pressed, recomputed by
   update_controls() at the top of every frame) — every reader in the frame sees
   the same press.
3. The per-frame edge promotion now runs in BOTH the live tick and the freeze
   harness's tickBatch (python parity: update_controls() per frame), and a
   keydown CAPTURES its edge immediately so a fast tap between frames is never
   lost (the old keydown-captured behaviour the gates' bootstrap depends on).

## Scooterboy sprite parity (the reported "rider initial frame off" + "knocked off off")

The engine had NO riding sprite branch, NO knocked_off branch, NO scooterboy
knockdown frame 3, NO death flash, and NO walk-suppression during riding — the
rider rendered through the generic walk/stand path (no bike sprite at all) and
the knock-off jumped straight to a capped knockdown. Python parity implemented:

- `scooterboy_ride_{facing}_{frame}_{variant}`: frame 0 cruising, min(frame//5, 2)
  while speeding up (python determine_sprite ~1272).
- `override_walking()` returns true while riding — the base walk/attack branch
  (which reset the ride-anim frame to 7) is skipped, exactly python's pass.
- The knock-off window: `knocked_off` frame 0 until frame > 10, then the knockdown
  "continuing from frame 1" (python determine_sprite ~740); the Scooter spawns at
  the transition (the existing game-loop hook).
- The scooterboy's knockdown has one extra frame (last_frame 3 vs 2 — python
  ~759); the knockdown_3 assets existed but were unreachable before.
- The death flash: falling with health <= 0, frame > 60, (frame//10)%2 == 0 ->
  blank (python ~729).
- The ride turn-around Y parity: the player standing -> the rider jumps to the
  player's Y; else the random Y >= 40px away via randint (an RNG-stream draw —
  python ~1321).

## Verification (frame-stepped, as requested)

- NEW unit gate `scooterboy.test.ts` (6 tests): walks the sprite formula per
  frame against python's formulas — riding cruise/accelerate, override_walking,
  knocked_off 0..10 then the knockdown from frame 1, the scooterboy's knockdown
  frame 3 (and the others' cap 2), the death flash windows.
- NEW e2e gate `cheat-konami.spec.ts` (2 tests): the live harness
  (`?freeze=0` — the harness defaults freeze=345!) feeds the Beat Streets Konami
  variant (UP DOWN LEFT RIGHT LEFT RIGHT A B) and asserts the cheat scene +
  canvas; the classic NES sequence must NOT open it.
- Frame-stepped captures (test-results/scooter-captures/): stage 3 rider — the
  ride sprite (the rider on the bike, ko-335), the knock-off (the rider flat,
  ko-358), the knockdown progression (ko-366/382), the scooter sliding away
  (python's vel = -facing*8 slide, off-screen by ko-382).
- 40 unit tests + 12 e2e (the 10 HARD gates byte-identical + 2 new) green;
  typecheck/build/lint green.

## Harness note

stage.html defaults `freeze=345` when absent — live-loop tests need `&freeze=0`.

---
# CRITIC — 019

The Konami starvation diagnosis is the round's gem: three independent defects
(the missing z binding, the destructive edge reads, the batched-path promotion)
each sufficient to make the cheat unreachable, and the fix lands on python's
exact update_controls() semantics rather than a workaround. The scooterboy work
is formula-level parity with unit pins per frame — the knockdown_3 assets being
present-but-unreachable proves the bug, and the turn-around randint is handled as
an RNG-stream-relevant draw. The freeze-default discovery (freeze=345) is
documented for future live-loop tests.
