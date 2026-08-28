# BUILDER — 016 CI fidelity-gate stabilisation

## Diagnosis (from actual CI logs, not speculation)

gh CLI logs of run 33143219679 (branch push): the static gates pass in CI at
0.00-0.01% (title/intro/controls/gameover), while the three LIVE-REPLAY gates
fail — each retry at exactly ~30s: `enemy attack on hero`, `hero punch
connecting`, `stage-1 live gameplay frame`. Those are the deep-freeze gates
(freeze >= 544), which need ~1600 game updates (the intro text runs to timer ~732
before the skip resets to 0). The harness advanced ONE update per requestAnimationFrame,
and CI's software-GL chromium fires rAF far slower than a local machine — the 40s
`waitForSelector('[data-frozen="1"]')` expired deterministically. The weapon spec
already needed its timeout raised to 120s for the same reason (a local symptom of
the same design flaw).

## Fix: batch deterministic updates per rAF (Host.tickBatch)

The freeze harness is a replay — game state depends only on the update COUNT, not
wall-clock. `Host.tickBatch(n, freezeAt)` advances up to n updates per rAF
(presenting once per batch) and returns when the freeze target is reached
(300k-update safety cap). The rAF loop uses it only when `freezeAtTimer` is set;
normal interactive play keeps the classic one-tick-per-rAF loop. The update
sequence is byte-identical to before — only pacing changes.

## Verification

- All 10 HARD gates green in **20.3s** (previously multi-minute) with diffs
  byte-identical to the established values (enemyattack 0.72% = 2757px,
  heropunch 0.79% = 3034px, stage 0.72% = 2783px, title 0.01% = 24px, rest 0.00%).
- 40 unit tests + typecheck + build green; engine dist rebuilt first.
- The workflow itself is finally exercised on a real push (carried since 008).

## Repo-flow note

Main was fast-forwarded/rebased externally to include rounds 014-015 (rewritten
hashes d1ac73f, 15d2cbe); per the operator's instruction this and all future
rounds commit directly on `main` — no more feature-branch dance.

---
# CRITIC — 016

The diagnosis is grounded in the actual failed-run logs (exact 30s timeouts on
exactly the deep-freeze gates, static gates passing) — the strongest kind of CI
evidence. The fix preserves the one property that matters (identical update
sequence) and PROVES it with byte-identical pixel diffs and px counts. The safety
cap fails loudly instead of hanging. Residual risk: CI's software-GL still renders
each frame slowly, but with batching the count of rAF ticks is ~7 per gate, so the
40s waits have enormous headroom.
