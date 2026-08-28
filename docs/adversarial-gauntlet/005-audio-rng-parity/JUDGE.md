# JUDGE — 005-audio-rng-parity

## Verdict
- ACCEPT_WITH_CONDITIONS — G1–G3 bit-verified against a real `--trace-rng` capture and the gate stays honestly informational; a hard stage gate is correctly deferred to an unimplemented frame-flow blocker.

## Authoritative assessment
- G1 verified: `game.playSound` unconditionally consumes `randint(0, variants-1)` from `game.rng` on every sound, including count-1 and off-screen/inaudible events, decoupled from playback (headless-safe); production unseeded path unchanged.
- G3 verified: ctor now pre-draws world-setup (83 colour variants + Stick/Chain durability) BEFORE the stolen-item choice, matching Python `setup_stages()`; 85 ctor draws bit-identical at seed 1, asserted in `sound-parity.test.ts`.
- G2 verified: `tools/capture_beatstreets_frame.py --trace-rng` is default-off and default output is byte-identical to the reference PNG; the sound-parity suite is correctly labeled engine-model parity.
- Critic's 3 fixes are applied: 99-draw gap re-attributed (85 ctor + 99 intro/fade + 51 live-combat); fade overlay explicitly documented as NOT implemented in the web engine; Host double-Game build qualified as RNG-harmless.
- G5: title 0.10% ≤1% hard green; intro 7.82% and stage 3.53% informational; precommit green (111 unit + 5 e2e); reference PNGs untouched.

## Conditions for acceptance
1. Implement the intro/fade replay path in the stage entry (the 255-frame fade overlay or an equivalent 255-frame timed window the web engine currently lacks) so the intro/fade sound draws fire and the enemy gains its 90 live frames; build the Game once in GameCanvas.
2. Re-measure bit-alignment (web state hash vs python via the traces) so the stage metric is over aligned states; only then promote the stage gate to HARD on an honestly derived threshold.
3. Optional judge-002: validate the title logo against a non-alpha-flattened pygame frame if it fits.

## Polished state
- Sound-variant selection now mirrors Python exactly: every draw consumes `game.rng` at the correct construction frame, bit-identical 85 draws at seed 1.
- `--trace-rng` provides a reproducible, default-off draw trace that byte-matches the reference capture.
- The blocker is frame flow, not PRNG correctness: the web's `jumpToStage` skips intro/fade, leaving 85/184 draws — precisely scoped next-round work.
- Honest gating: the stage metric stays informational because states are demonstrably unaligned; title gate remains hard green.
