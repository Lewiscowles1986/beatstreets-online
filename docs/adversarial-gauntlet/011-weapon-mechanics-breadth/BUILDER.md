# BUILDER — 011 weapon-mechanics groundwork (partial round)

## Note on process
The round's builder subagent hit its token limit twice with zero edits. The
orchestrator pivoted to groundwork-only: driver infrastructure + exploration +
documented next-round plan (see MEASUREMENT.md). No web source changes this round —
deliberately, so 012 starts from a committed, verified base rather than half-wired
engine edits.

## Delivered (web repo)
- 011 GOAL.md (weapon-breadth goal) + MEASUREMENT.md (findings + 012 plan).
- No production/e2e changes: all 8 HARD gates unchanged and green (last precommit
  exit 0 at 010: 76 engine + 39 web unit + build + 10 e2e).

## Handoff to 012 (in priority order)
1. Engine fixes: pickup animation frame (min(frame//12, endPickupFrame)); barrel
   roll-frame counter (only while rolling); weapon draw order (merge into the
   y+offset sorted list).
2. Web harness: stage.html?stage=N → jumpToStage at the end of the first post-skip
   update (counterpart of the driver's --stage hook).
3. Schedule capture: stage-5 hoodie fight (hold right + ~20-frame punch cadence;
   the player must walk IN — the hoodie keeps 140 > punch reach 105), kill →
   randint(0,2)==0 stick drop → pickup → swing. ~1000+ live frames.
4. Full-stream parity test + HARD gates (npm run fidelity + CI, not precommit —
   runtime), FIDELITY.md weapon section.
