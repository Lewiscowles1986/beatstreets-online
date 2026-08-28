# Round 023 — Judge

## Ruling: ACCEPT — the weapon gates are CLOSED

The gauntlet's longest-open item (the 013/014 weapon-gate residual, documented across
012/014/015/021/022) is resolved. Final measured state, all HARD thresholds met:

| gate | fraction | threshold |
|---|---|---|
| weapon pickup | 0.67% | ≤1.5% |
| weapon pickupanim | 0.69% | ≤1.5% |
| weapon swing | 0.73% | ≤1.5% |
| stage | 0.54% | ≤1.5% |
| action enemyattack | 0.53% | ≤1.5% |
| action heropunch | 0.60% | ≤1.5% |
| title | 0.01% | — |
| intro / controls / gameover | 0.00% | ≤2.0/0.5/0.5% |

## Why it held for so long

Two independent causes masked each other: (1) a one-frame-early harness stage jump —
invisible to the RNG-stream parity because the shifted enemies were in a draw-free
pause, but visible as a permanent ±1-frame choreography offset; (2) WebGL quads
rendered at fractional positions while python truncates — invisible in the near-integer
action captures, visible as a full-texture shift in every scrolled scene. The new
?trace/state-row instrumentation pinned both with per-frame evidence.

## Standing state of the objective

1:1 fidelity gates now ALL pass their HARD thresholds. The gauntlet's remaining purpose
is regression guarding + breadth; the per-round loop (docs + conventional commit +
pre-commit) continues. Next rounds should pick up residual polish (e.g. the 0.5-0.7%
action/stage residuals are sub-pixel noise worth a look only if they regress) and
continue the sync-tooling work.