import { describe, it, expect } from 'vitest';
import { Game, ControllerInput, EnemyPortal, FallingState, Attack } from '@beatstreets/engine';
import { loadGameSpec } from './data';

class NoInput implements ControllerInput {
  getX() { return 0; } getY() { return 0; } held() { return false; } pressed() { return false; }
  update() {} dispose() {}
}
const punch = () => new Attack(loadGameSpec().attacks.punch);

describe('one-hit mode kills portals too (026)', () => {
  it('portal dies from a single punch: explosion, no fall, then removal', () => {
    const game = new Game(loadGameSpec(), new NoInput());
    game.jumpToStage(14);
    game.cheatState.settings.onePunch = true;
    const portal = game.createSpawnedEnemy('EnemyPortal', game.player.vpos.clone()) as EnemyPortal;
    expect(portal).toBeTruthy();
    game.enemies.push(portal);
    portal.spawned();
    // Put the portal squarely in front of the player and punch via the real attack path.
    portal.vpos.x = game.player.vpos.x + 60;
    portal.vpos.y = game.player.vpos.y;
    game.player.facingX = 1;
    game.player.attack(punch());
    expect(portal.health, 'one-hit zeroes portal health').toBeLessThanOrEqual(0);
    expect(portal.fallingState, 'portal must not fall on the kill').toBe(FallingState.STANDING);
    // The portal runs out its PAUSE timer, enters PORTAL, then explodes on health <= 0.
    let exploded = -1;
    for (let i = 0; i < 120 && exploded < 0; i++) {
      game.update();
      if ((portal as unknown as { state: number }).state === 7) exploded = i;
    }
    expect(exploded, 'portal reaches PORTAL_EXPLODE after the one-hit').toBeGreaterThanOrEqual(0);
    // The explosion runs ~50 frames, then the game loop removes the dead portal.
    let removed = -1;
    for (let i = 0; i < 160 && removed < 0; i++) {
      game.update();
      if (!game.enemies.includes(portal)) removed = i;
    }
    expect(removed).toBeGreaterThanOrEqual(45);
  });

  it('regular enemies keep the established one-hit behaviour', () => {
    const game = new Game(loadGameSpec(), new NoInput());
    game.jumpToStage(1);
    game.cheatState.settings.onePunch = true;
    const enemy = game.enemies[0];
    enemy.vpos.x = game.player.vpos.x + 40;
    enemy.vpos.y = game.player.vpos.y;
    game.player.facingX = 1;
    game.player.attack(punch());
    expect(enemy.health).toBe(0);
    expect(enemy.lives).toBe(1);
    expect(enemy.fallingState).toBe(FallingState.FALLING);
  });
});