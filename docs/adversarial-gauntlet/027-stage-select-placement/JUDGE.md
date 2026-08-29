# Round 027 — Judge

## Ruling: ACCEPT

Stage select and the sandbox knob now place the character at a SPECIFIC X coordinate
for the chosen stage (300px in front of its first enemy/portal) and start the camera
there — a fresh storybook load shows the stage's action from frame one, both in the
sandbox and in the static StageView portal stories. The capture-harness path keeps
its driver-parity contract unbroken (all seeded parity suites and every HARD gate
reproduce unchanged).

Round 6 of 8 closes with the placement work committed; the final round (7/8) was spent
on this round. Remaining candidate work for any extension: the stale
`ci/fix-canvas-sizing-flake` branch cleanup and the e2e flake it referenced (one flaky
game-over capture this round, green on rerun and in isolation).