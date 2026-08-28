import { describe, it, expect } from 'vitest';
import { Game, ControllerInput } from '@beatstreets/engine';
import { loadGameSpec } from './data';

class NoInput implements ControllerInput {
  getX() { return 0; }
  getY() { return 0; }
  held() { return false; }
  pressed() { return false; }
  update() {}
  dispose() {}
}

/** Drive a jumped-to stage to its "cleared" state (no enemies, fully scrolled). */
function clearStage(game: Game): void {
  for (const e of game.enemies) e.lives = 0;
  // Remove the dead enemies the way the next update would.
  game.update();
  // Force the scroll to the stage's max so the progression trigger is fully met.
  const max = (game as unknown as { maxScrollOffsetX: number }).maxScrollOffsetX;
  (game as unknown as { scrollOffset: { x: number } }).scrollOffset.x = max;
  game.update();
}

describe('stage lock (sandbox stage progression)', () => {
  it('locked: a jumped-to stage never advances, never triggers the outro, never wins', () => {
    const game = new Game(loadGameSpec(), new NoInput(), { stageLocked: true });
    game.jumpToStage(1);
    clearStage(game);
    expect(game.stageIndex).toBe(0);
    expect(game.textActive).toBe(false);
    expect(game.checkWon()).toBe(false);
    // Even many frames later the game stays on the one stage.
    for (let i = 0; i < 120; i++) game.update();
    expect(game.stageIndex).toBe(0);
    expect(game.checkWon()).toBe(false);
  });

  it('unlocked: the same cleared state advances to the next stage', () => {
    const game = new Game(loadGameSpec(), new NoInput());
    game.jumpToStage(1);
    clearStage(game);
    expect(game.stageIndex).toBe(1);
  });

  it('injected loader: the spec the shell passes in is the spec the game uses', () => {
    const spec = loadGameSpec();
    const game = new Game(spec, new NoInput(), { stageLocked: true });
    game.jumpToStage(3);
    // The game consumes the injected spec objects directly (config by identity; the
    // stage count visible through the public length used by the shell).
    expect(game.config).toBe(spec.config);
    expect(game.stageIndex).toBe(2);
  });
});