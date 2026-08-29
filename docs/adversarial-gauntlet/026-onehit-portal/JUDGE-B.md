# Round 026 — Judge (addendum B: portal pacing)

## Ruling: ACCEPT

The spawn-pacing pipeline was audited end-to-end against python and found parallel
except for the stage-26/29 default cap (600 vs 250) — fixed to python's literal.
Headless side-by-side captures confirm stages 15/19 already matched; the new cap
default makes 26/29 keep slowing down like python too. Three pacing tests lock it in;
all gates reproduce unchanged.

Note for the record: the earlier BUILDER addendum's "2.5x faster" claim holds only for
stages that never pass an explicit cap (26/29) and only while spawning stays under
max_enemies — python's too-many retry pins both engines identically elsewhere.