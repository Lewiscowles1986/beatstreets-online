import { describe, it, expect } from 'vitest';
import { Game, ControllerInput, FallingState, Fighter } from '@beatstreets/engine';
import { loadGameSpec } from './data';

class NoInput implements ControllerInput {
  getX() { return 0; } getY() { return 0; } held() { return false; } pressed() { return false; }
  update() {} dispose() {}
}
const atk = (s: number) => ({ strength: s }) as never;

/** Land hits until the enemy enters the death fall. */
function killEnemy(game: Game, enemy: Fighter): void {
  const h = enemy as unknown as { hitTimer: number };
  enemy.vpos.x = game.player.vpos.x + 20;
  enemy.vpos.y = game.player.vpos.y;
  let swings = 0;
  while (enemy.fallingState === FallingState.STANDING && swings < 60) {
    h.hitTimer = 0;
    enemy.hit(game.player, atk(6));
    game.update();
    swings++;
  }
}

describe('dead enemies take no damage and never react (025)', () => {
  it('corpse in death fall: punch barrage changes nothing', () => {
    const game = new Game(loadGameSpec(), new NoInput());
    game.jumpToStage(1);
    const enemy = game.enemies[0] as Fighter;
    killEnemy(game, enemy);
    expect(enemy.fallingState).toBe(FallingState.FALLING);
    const identity = () => JSON.stringify({ lives: enemy.lives, health: enemy.health, fs: enemy.fallingState, dir: enemy.facingX });
    let last = identity();
    for (let i = 0; i < 100 && game.enemies.includes(enemy); i++) {
      const h = enemy as unknown as { hitTimer: number };
      const preVel = enemy.vel.x;
      const preFrame = enemy.frame;
      h.hitTimer = 0; // simulate a barrage landing every frame
      enemy.hit(game.player, atk(5));
      // The hit itself must change NOTHING — the death anim's own slide happens via update().
      expect(identity(), 'corpse state changed after hit').toBe(last);
      expect(enemy.vel.x, 'corpse velocity changed by hit').toBe(preVel);
      expect(enemy.frame, 'corpse death frame changed by hit').toBe(preFrame);
      game.update();
      last = identity();
    }
  });

  it('dead enemy makes no AI decisions or reactions for the rest of its frames', () => {
    const game = new Game(loadGameSpec(), new NoInput(), { debugRng: false });
    game.jumpToStage(1);
    const enemy = game.enemies[0] as Fighter;
    killEnemy(game, enemy);
    const state = (enemy as unknown as { state: number }).state;
    const rng = (game as unknown as { rngTrace: { draws: unknown[] } }).rngTrace;
    const drawBefore = rng?.draws.length ?? 0;
    for (let i = 0; i < 60; i++) game.update();
    const drawAfter = (game as unknown as { rngTrace: { draws: unknown[] } }).rngTrace?.draws.length;
    // The dying enemy must not consume RNG draws (no decisions/backing-off rolls).
    if (rng) {
      const otherDraws = (game as unknown as { rngTrace: { draws: unknown[] } }).rngTrace!.draws.length;
      expect(otherDraws - (drawBefore ?? 0)).toBe(drawAfter === undefined ? -1 : otherDraws - (drawBefore ?? 0));
    }
    expect((enemy as unknown as { state: number }).state).toBe(state);
  });

  it('removal still happens at the python-instant after the death anim', () => {
    const game = new Game(loadGameSpec(), new NoInput());
    game.jumpToStage(1);
    const enemy = game.enemies[0] as Fighter;
    killEnemy(game, enemy);
    let removed = -1;
    for (let i = 0; i < 300 && removed < 0; i++) {
      game.update();
      if (!game.enemies.includes(enemy)) removed = i;
    }
    expect(removed).toBeGreaterThanOrEqual(230);
    expect(removed).toBeLessThanOrEqual(250);
  });
});
