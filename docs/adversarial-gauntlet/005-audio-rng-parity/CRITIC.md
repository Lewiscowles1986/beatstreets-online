# CRITIC — 005-audio-rng-parity

## Verdict
- ACCEPT_WITH_FIXES — G1/G2/G3 are genuinely implemented and bit-verified against a real
  Python `--trace-rng` capture, and the gate stays honestly informational; the blockers are
  documentation precision (99-draw attribution, unimplemented fade) that must be corrected.

## Findings
- [MED] docs/FIDELITY §4 + MEASUREMENT: the 99-draw gap is attributed to "intro text +
  255-frame fade." A real `--trace-rng` capture shows 51 of the 99 occur at frame≥350 —
  LIVE gameplay (off-screen enemy combat hits), and the engine-level capture reaches
  exactly 85 with 0 combat draws in 345 frames (probe: the web enemy's first attack lands
  only ~frame 1000). The gap is frame-flow misalignment delaying the enemy's first attack,
  not primarily intro/fade sound draws. → Re-attribute from the trace (85 ctor + intro/fade
  + 51 live-combat) so the blocker matches the evidence.
- [MED] BUILDER/FIDELITY list the Host's double Game construction as a divergence cause. It
  is RNG-harmless: both builds seed identically and consume the identical 85 ctor draws, so
  the live Game sits at the same RNG position as a single build. → Drop or qualify.
- [MED] Next-round plan "replay intro + 255-frame fade" is underspecified: the web engine has
  NO fade mechanism (no `fade` in packages/engine). The 255 fade frames are what give Python's
  enemy time to close distance and start attacking; the web must add that frame window (visual
  fade or an equivalent timer) before the 90 live frames, not merely remove `jumpToStage`.
  → Scope the fade implementation explicitly.
- [LOW] test "G4 capture-schedule" drives a single engine Game, not the real stage.html path
  (double-built Host). It asserts 85 and happens to match, but the name overclaims. → Rename
  to engine-model parity or drive the actual entry.
- [LOW] sound-parity.test.ts: `PY_CTOR_NUMERIC`/`PY_CTOR_CHOICE` are hardcoded with only prose
  provenance; no pinned trace artifact/script regenerates them. → Commit the `--trace-rng`
  output or a generator so the vector is reproducible, not a frozen literal.

## Fidelity assessment
- G1 real: playSound draws randint(0,count-1) unconditionally (no AudioContext required);
  count-1 → randint(0,0); off-screen combat hits draw (probe: 178 draws/12 combat by frame
  1000); production unseeded path (systemRng) equivalent. Verified.
- G2: --trace-rng default off; default capture md5 e0e294bb… == reference
  e2e/reference/beatstreets-gameplay-stage.png (md5 e0e294bb…). Verified byte-identical.
- G3: world-setup order (colour variants + Stick durability before stolen choice) matches
  Python; 85 ctor draws bit-identical to real trace — PY_CTOR_NUMERIC verified value-for-value.
- G4: stage gate stays informational at 3.53%; story consistent across spec comment,
  MEASUREMENT, BUILDER. Honest given demonstrably unaligned states.
- G5: 76 engine + 35 web unit tests green (re-run); reference PNGs untouched (`git diff HEAD
  -- e2e/reference/` empty; only e2e/screenshots/* regenerated).

## Required before judge
1. Correct the 99-draw attribution with the trace-derived live-combat vs intro/fade split.
2. Note the fade overlay is unimplemented and scope it (or an equivalent 255-frame window) in
   the next-round plan.
3. Qualify the double Game build as RNG-harmless and mark the G4 test as engine-model parity.
