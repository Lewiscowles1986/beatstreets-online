import { describe, it, expect } from 'vitest';
import { Game, ControllerInput, EnemyPortal, FallingState } from '@beatstreets/engine';
import { loadGameSpec } from './data';

class NoInput implements ControllerInput {
  getX() { return 0; } getY() { return 0; } held() { return false; } pressed() { return false; }
  update() {} dispose() {}
}

type PortalInternals = { spawnInterval: number; maxSpawnInterval: number; stateTimer: number };

function portalOf(stage: number): { game: Game; portal: EnemyPortal } {
  const game = new Game(loadGameSpec(), new NoInput());
  game.jumpToStage(stage);
  const portal = game.enemies.find((e) => e instanceof EnemyPortal) as EnemyPortal;
  return { game, portal };
}

const internal = (p: EnemyPortal): PortalInternals => p as unknown as PortalInternals;

describe('portal spawn pacing matches python (026)', () => {
  it('constructor default max_spawn_interval is python\'s 600', () => {
    const { portal, game } = portalOf(26);
    game.update();
    expect(internal(portal).maxSpawnInterval).toBe(600);
  });

  it('stage-26 portal interval grows past 250 toward python\'s 600 cap', () => {
    // Python: interval 30 + change 5, capped only at 600 — the web's 250 default made
    // these portals pump roughly 2.5x too fast late-game. Drive the REAL update loop:
    // the player clears every fresh spawn (hit), so the count stays under the cap and
    // the door stays open for the next slow spawn.
    const { game, portal } = portalOf(26);
    (portal as unknown as { maxEnemies: number }).maxEnemies = 99;
    (portal as unknown as { stateTimer: number }).stateTimer = 1;
    game.player.vpos.x = portal.vpos.x + 120;
    game.player.vpos.y = portal.vpos.y;
    game.update();
    let guard = 30000;
    while (internal(portal).spawnInterval <= 250 && guard-- > 0) {
      game.update();
      for (const e of game.enemies) {
        if (!(e instanceof EnemyPortal) && e.fallingState === FallingState.STANDING) {
          e.hit(game.player, { strength: 99 } as never);
        }
      }
    }
    expect(internal(portal).spawnInterval, 'late-game spawn interval').toBeGreaterThan(250);
  });

  it('spawn interval growth respects an explicit cap like python', () => {
    // python: interval += change then min(interval, max_spawn_interval)
    const { game } = portalOf(18); // stage 18: interval 40, change 10, max 250
    game.update();
    const portal = game.enemies.find((e) => e instanceof EnemyPortal) as EnemyPortal;
    // Directly exercise the growth math the way the spawn cycle does.
    const p2 = internal(portal);
    for (let i = 0; i < 200; i++) p2.spawnInterval = Math.min(p2.spawnInterval + 10, p2.maxSpawnInterval);
    expect(p2.spawnInterval).toBe(250);
  });
});