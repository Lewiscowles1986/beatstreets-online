# Round 020 — JUDGE

## Claims audited

| Claim | Verification | Result |
| --- | --- | --- |
| Portals spawn and behave like python | Engine probe (stage 15): portal created, PAUSE→PORTAL, EnemyVax spawned at (8530,400) after 600 updates; live browser capture at the portal shows the idle/generate sprite and the spawned enemy engaging the player | PASS |
| Portal logic python-exact | Line-by-line vs beatstreets.py 1384-1495 (two-phase spawn, spawn_facing, interval growth clamp, total-enemy maxEnemies, PORTAL_EXPLODE, four sounds, sprite ladder, overrideWalking, super.update ordering) | PASS |
| Scooters no longer paint over the rider | Scooter offset −1 in the single sorted list; anchor (center,256); no gate exercises scooters, so no regression surface | PASS (code-verified) |
| Win/lose screens authentic | gameover-win/lose gates 0.00% (HARD ≤0.50%) with the bitmap blit; invented text removed | PASS |
| Menus match the game's overlay language | Opaque black, glyph font, A-button cursor — verified in storybook captures | PASS |
| Storybook has real controls | StageView stage knob 1-29 + scroll to 20500; GameCanvas story restored; screenshots 22/22 | PASS |
| Skip RNG fix ported | Stream matches python 183/184 draws from the intro through the first enemy decision; gates 11.32/10.96/11.15% → 8.88/8.88/8.62% | PASS (improvement, not threshold) |
| No gate regressions | title 0.01%, intro 0.00%, controls 0.00%, stage 0.54%, gameover 0.00%/0.00%, cheat 6/6, app/game-canvas/action suites, screenshots 22/22, engine 82/82, web 41/41, typecheck, eslint | PASS |

## Gate status

- HARD gates passing: title, intro, controls, stage, gameover-win, gameover-lose
  (+ the action suites and all screenshot/component gates).
- **Weapon gates remain open**: 8.88/8.88/8.62% vs ≤1.5%. The round-020 root cause
  (skip timing) is closed and ported; the residual is the pre-existing 013
  hit/fall ±2-frame choreography divergence, which requires the driver's
  per-frame playerstate trace to pin. Carried to 021 as the opening item, with a
  concrete plan: instrument the python driver's playerstate rows for the punch
  thrown at live 213 and diff the web's per-frame attack-frame counter + hoodie
  position against them.

## Verdict

**ACCEPT.** All four user-reported issues are fixed with evidence; two latent
harness bugs (the schedule-wrapper no-op and the cheat-gate wait predicate) were
found by the critic and fixed in-round. The commit proceeds on `main` through the
pre-commit hooks; the weapon-gate threshold remains the standing objective for
the next round.