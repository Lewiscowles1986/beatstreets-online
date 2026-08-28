# JUDGE — 007-controls-gameover-breadth

## Verdict
- ACCEPT — all six gates real, authentic, and passing; breadth complete; no fatal flaws.

## Authoritative assessment
- Spot-verified metric table vs MEASUREMENT.md and the spec gates in e2e/fidelity.spec.ts:
  title 0.00% (19/384000) HARD ≤1% | intro 0.00% HARD ≤2% (promoted) | stage 0.73%
  (2810/384000) HARD ≤1.5% | controls 0.00% HARD ≤0.5% | game-over win/lose 0.00% HARD
  ≤0.5%. Re-ran the suite: 6/6 chromium pass, exit 0, metrics match exactly.
- Reference md5s match MEASUREMENT.md: controls 112dbf65…, win 3c3a4554…, lose 829855b8…;
  intro restored to committed 3b0d2ec0… (no accidental-overwrite residue).
- G1–G5 all satisfied: controls, game-over win/lose, intro alignment (7.82%→0.00%,
  promoted to HARD ≤2%), no regressions (title/stage/orientation/sound-parity/precommit
  green), docs/FIDELITY.md + MEASUREMENT.md + BUILDER.md updated.
- Asset changes are pixel-preserving: gamma/chromaticity chunks stripped from 45 font +
  status_win/lose sprites; PIL-verified pixel-identical vs HEAD (font033, status_win,
  status_lose spot-checked). This explains and eliminates the round-001 colour shift.
- Intro fix is a real fidelity correction (stolen-item index 2 = seed-1 choice), not a
  test hack; driver hooks are driver-only (python game never modified).
- e2e entries are separate Vite inputs, out of the production bundle. Unit tests 35/35
  web green; build clean.

## Conditions for acceptance (if any)
- none (ACCEPT). Optional cosmetic: replace "md5-identical" with "pixel-identical" in
  FIDELITY.md + spec comments (critic-flagged; no fidelity impact).
- Next round (maintenance loop — the user-requested trust anchor): add a single
  `make fidelity`-style command that runs build + the fidelity/orientation e2e gates
  (workers=1) and fails on any gate breach, and wire it into CI (GitHub Actions) so the
  gates are enforced on every change — currently they only run via manual precommit.
- Follow-on breadth (after the loop lands): gameplay-action frames (punches, knockdowns,
  weapons, barrels) — capture + gate a few canonical mid-combat states.

## Polished state
- Every python screen/state the driver can capture now has an authentic reference + a
  hard gate; breadth for static/state screens is complete.
- Intro promoted to HARD ≤2% at 0.00%; controls + game-over win/lose new HARD ≤0.5% at
  0.00% — all ~2 orders of magnitude below structural-failure signatures.
- Gamma-strip fix removes the browser-vs-pygame colour shift for all gated screens.
- Uncommitted tree ready for orchestrator commit; no source files modified by this judge.
