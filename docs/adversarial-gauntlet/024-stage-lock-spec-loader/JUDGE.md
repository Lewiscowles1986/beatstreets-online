# Round 024 — Judge

## Ruling: ACCEPT

Both user points resolved:

1. The playable stage is now EXACTLY one stage: `stageLocked` (engine option) removes
   the progression trigger — clearing it never advances, never shows the outro, never
   wins. The storybook knob remains the "defined stage list" (1-29) — pick any stage
   as the sandbox.
2. The shell no longer hard-codes the data source: `loadSpec` is injected into
   GameCanvas/PlayableStage, invoked at game start, and the loaded spec IS the shell's
   state going forward (cached and reused across replays/knob changes). The bundled
   loader is just the default injection.

Evidence: storybook capture of the live locked stage-1 sandbox with the real world
rendered; three new unit tests (locked never advances/wins, unlocked advances, the
injected spec consumed by identity); full precommit and all fidelity HARD gates green.

## Next round (025)

No open fidelity items — every HARD gate passes. Candidate work: apply the same
loader-injection seam to the App's eager overview (a fetch-based loader for a
self-hosted data dir), or delete the stale `ci/fix-canvas-sizing-flake` branch on
confirmation.