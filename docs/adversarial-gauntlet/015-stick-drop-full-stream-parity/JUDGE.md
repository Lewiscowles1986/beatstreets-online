# BUILDER — 015 stick drop + full-stream parity

## Implemented: EnemyHoodie.died() — the stick drop

Python beatstreets.py ~1242: on hoodie death, `randint(0,2) == 0` appends a
`Stick(self.vpos)` whose ctor draws `randint(12,16)` durability. The web's
`EnemyHoodie` had no `died()` override (the stick could never drop). Now:
`died()` pushes `new Stick(this.game, this.vpos.clone())` on the same roll; the
web Stick ctor already defaulted durability to `randint(12,16)`.

## Result: FULL randint-stream parity

The weapon-schedule headless replay now matches python's capture for the ENTIRE
stream (354/354 draws) — the test asserts `web.slice(0, py.length) == py` with
<=2 trailing freeze-boundary draws allowed. The 014 delta (the stick-drop roll
arriving 2 draws late from the hoodie's own-punch cascade) closed with the drop
implemented: the missing draws were exactly the missing death-roll draws.

## Browser alignment: stage-jump timing

The shell's harness stage jump fired at the END of the SECOND post-intro update
(`postFlipUpdates >= 1`) while the driver hook and the headless replay jump after
the FIRST. Aligned; the three weapon pixel gates improved (27.24/13.17/11.68 ->
24.40/12.51/11.24) but still fail on frame content — the headless stream is exact,
so a browser-vs-headless replay delta remains. Re-skipped with updated evidence;
next round diffs the browser's own randint trace against the headless one.

## Fixed: HiDPI WebGL quarter-scale render (user-reported)

User report on a Retina display: the game rendered at ~1/4 size pinned to the
canvas's bottom-left with stale yellow streaks elsewhere. Root cause chain:
`Host.attach` scaled the canvas backing store by devicePixelRatio (1600x960) but
`WebGLRender` keeps viewport/quad/u_res/overlay at logical 800x480 ->
`gl.viewport` covered only the buffer's bottom-left quarter, and
`preserveDrawingBuffer: true` left the never-drawn remainder showing stale frame
pixels (the "yellow line" = remnants of earlier street rendering). The storybook
components were unaffected (plain 2D path + `ctx.setTransform(dpr,...)`).
Headless e2e (dpr=1) never saw it. Fix: keep the WebGL drawing buffer at logical
size and let the browser upscale to the CSS box; the 2D path keeps its DPR
transform. All 8 HARD gates + 40 unit tests green after the fix.

## Harness notes

- The repo flipped to `main` again mid-round (external actor); work continued on
  `ci/fix-canvas-sizing-flake` after restoring the checkout.
- Engine dist rebuilt before vitest after the enemies.ts change.

---
# CRITIC — 015

The headline claim is the strongest yet: full 354/354 randint-stream equality
against the python capture, asserted in an active (un-skipped) test. The stick
drop is implemented with the exact python roll order (drop roll, then durability
in the ctor). The HiDPI fix is verified by reasoning from the code (viewport vs
backing store) plus the unchanged green gates; it is honest to note the fix was
NOT visually confirmed on a real Retina browser — the user should reload the dev
page to confirm. The weapon pixel gates stay honestly skipped with refreshed
measurements and a concrete next probe (browser-side RNG trace vs headless).

---
# JUDGE — 015 verdict: ACCEPT (full stream parity + real user-facing fix)

- The RNG stream is now bit-exact for the whole capture — the strongest determinism
  evidence in the gauntlet so far.
- The HiDPI WebGL fix addresses a genuine rendering defect with a precise
  mechanism; carry the visual confirmation on the user's display to the next round.
- Carry-forward to 016: (1) trace the BROWSER replay's randint stream (add a
  ?trace-rng hook) and diff against the headless stream to close the remaining
  ~12-24% pixel delta; (2) then un-skip the three weapon pixel gates;
  (3) validate .github/workflows/fidelity.yml on the next real push (carried
  since 008); (4) keep the branch rebased; main has diverged (external PR merge).
