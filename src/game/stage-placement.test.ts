import { describe, it, expect } from 'vitest';
import { Game, ControllerInput } from '@beatstreets/engine';
import { loadGameSpec, loadResolvedStages } from './data';

class NoInput implements ControllerInput {
  getX() { return 0; } getY() { return 0; } held() { return false; } pressed() { return false; }
  update() {} dispose() {}
}

describe('stage-select placement (027)', () => {
  it('cheat/sandbox jump places the character in front of the stage\'s first enemy', () => {
    const game = new Game(loadGameSpec(), new NoInput());
    game.jumpToStage(15); // the 8400-max portal stage; the portal at x 8900
    expect(game.player.vpos.x).toBe(8900 - 300);
    // Deep stage: nowhere near the stage-1 default.
    expect(game.player.vpos.x).toBeGreaterThan(8000);
    const stages = loadResolvedStages().stages;
    expect(stages[14].enemies[0].pos[0]).toBe(8900);
  });

  it('driver-parity jumps stay at the python driver\'s literal 400,400', () => {
    const game = new Game(loadGameSpec(), new NoInput());
    game.jumpToStage(15, { resetTimer: false });
    expect(game.player.vpos.x).toBe(400);
    expect(game.player.vpos.y).toBe(400);
  });

  it('explicit place wins over every default (the harness hook)', () => {
    const game = new Game(loadGameSpec(), new NoInput());
    game.jumpToStage(5, { resetTimer: false, place: { x: 700, y: 420 } });
    expect(game.player.vpos.x).toBe(700);
    expect(game.player.vpos.y).toBe(420);
  });
});