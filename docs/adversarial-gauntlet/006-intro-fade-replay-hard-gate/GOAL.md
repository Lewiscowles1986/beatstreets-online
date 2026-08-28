# Iteration 006 — Intro/fade replay: bit-aligned captures, HARD stage gate

## Carry-in conditions (from JUDGE 005)

1. Implement the intro/fade replay path in the stage entry — the 255-frame fade overlay
   (or an equivalent 255-frame timed window the engine lacks) so the intro/fade sound
   draws fire; build the Game ONCE in GameCanvas (no double build).
2. Re-measure bit-alignment (web vs python state/draw hash via the traces) and promote
   the stage gate to HARD only on an honestly aligned metric.
3. Optional/stretch (from JUDGE 002): validate the title logo against a true
   non-alpha-flattened pygame frame.

## Ground truth

- Python capture (seed 1, --skip-intro --frames-to-play 90): 184 draws by freeze.
  [ERRATUM, corrected by the 006 trace] the true decomposition is 85 ctor + 99
  teletype sound draws = 184; the "+51 live-combat" figure carried over from 005 was
  an instrumentation-era misattribution.
- Web: ctor 85 draws bit-match; `jumpToStage` skips intro text + fade → 99 draws
  unreached; live-combat draws unreached in the 345-frame window.
- Capture pair: stage.html?seed=1&freeze=345 ↔ tools/capture_beatstreets_frame.py
  --trace-rng (draw sites), --seed 1 --skip-intro --frames-to-play 90 (reference).
- e2e/reference/beatstreets-gameplay-stage.png is the python frame to match.

## Goal (builder must satisfy ALL)

- [ ] G1. Stage entry replays the real flow: build Game once; run intro text + the
      255-frame fade (overlay or equivalent timed window) with the SAME sound draws as
      python (99 intro/fade sound-variant draws), then 90 live frames. No jumpToStage
      in the capture path; Host builds Game exactly once on this path.
- [ ] G2. Bit-alignment evidence: with the same seed, the web and python RNG streams
      agree through the freeze point (draw-count + per-draw site/sequence hash from the
      traces). Document remaining divergences precisely if any (frame-flow, not PRNG).
- [ ] G3. Stage metric re-measured. If aligned: promote the gate to HARD with an
      honestly derived threshold (aligned metric + documented headroom; expect intro-
      level ~7.8% or better — sprite animation frames may legitimately differ by ±1
      frame; document the residual source). If not aligned: name the exact first
      diverging frame/consumer from the trace and fix it if mechanical.
- [ ] G4. No regressions: title hard ≤1% green; orientation green; sound-parity unit
      test updated/extended (now covers intro/fade window); precommit green.
- [ ] G5. docs/FIDELITY.md §4 + 006 MEASUREMENT.md + BUILDER.md updated (draw tables,
      aligned numbers, threshold derivation).

## Out of scope

- New gameplay features; music; controls/game-over screens; title-logo stretch goal
  only if everything else lands cleanly.

## Definition of done

Precommit green; hard stage gate live (or precisely-scoped blocker with the honest
metric); uncommitted tree ready for orchestrator commit.