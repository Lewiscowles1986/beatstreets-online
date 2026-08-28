# Iteration 008 — Maintenance loop + gameplay-action breadth

## Carry-in conditions (from JUDGE 007)

1. Maintenance loop: a single command that regenerates references, runs every gate,
   and reports a fidelity table — the tool the maintainer reaches for after editing
   the python game. Wire it into CI (push/PR) so fidelity regressions fail loudly.
2. Gameplay-action breadth: capture + gate 2-3 canonical mid-combat frames
   (e.g. hero punch connecting, enemy knockdown, barrel/weapon in flight).

## Established workflow (reuse)

- Driver: tools/capture_beatstreets_frame.py (--state, --skip-intro, --frames-to-play,
  --seed, --trace-rng, --result). Deterministic, seeded; authentic frames only.
- Gates: e2e/fidelity.spec.ts (title/intro/stage/controls/win/lose — all HARD);
  precommit runs fidelity + game-canvas/orientation (workers=1).
- .github/workflows/pages.yml exists (pages deploy) — add a separate CI workflow.

## Goal (builder must satisfy ALL)

- [ ] G1. One command: `npm run fidelity` in beatstreets-web — builds, regenerates ALL
      python references via the driver (into a temp dir first; only overwrites
      e2e/reference/ when md5 CHANGES, printing old→new), runs the fidelity +
      orientation gates, and prints a metric table. Parent-repo convenience: a
      `make fidelity` target in the root Makefile that calls it (venv python path).
- [ ] G2. CI: new .github/workflows/fidelity.yml — on push/PR to the web repo: install
      (npm ci with cache), build, run the fidelity gate (chromium; workers=1), upload
      the fidelity screenshots as artifacts on failure. Must be green on this round's
      push (or documented why it can't run in this sandbox).
- [ ] G3. Gameplay-action breadth: extend the driver with deterministic action
      scheduling (e.g. --press frame:button pairs or scripted schedules) to capture 2-3
      authentic mid-combat frames (hero attack anim, enemy knockdown, weapon in
      flight) at seed 1; matching web captures via the replay entry (frame-exact
      freeze at the equivalent timers); fidelity tests — HARD where the draw trace
      proves state alignment, otherwise informational with the trace-derived blocker.
- [ ] G4. No regressions: ALL existing gates stay green (title/intro/stage/controls/
      win/lose/orientation); `npm run precommit` green; sound-parity green.
- [ ] G5. docs/FIDELITY.md (maintenance-loop section: the one command, CI behaviour),
      008 MEASUREMENT.md + BUILDER.md.

## Out of scope

- New gameplay features; music; visual restyling.

## Definition of done

Precommit green; `npm run fidelity` works end-to-end; CI workflow committed; uncommitted
tree ready for orchestrator commit.