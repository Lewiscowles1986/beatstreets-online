import { describe, it, expect } from 'vitest';
import { Game } from './game';
import { FallingState } from './fighter';
import { Player } from './player';
import { EnemyVax } from './enemies';
import { buildSpec } from '../dsl/game-spec';
import { Vec2 } from '../core/math';
import { GameButton, ControllerInput } from '../core/controller';

/** A deterministic fake controller we drive by hand. */
class FakeControls implements ControllerInput {
  x = 0;
  y = 0;
  buttons = new Set<GameButton>();
  pressQueue: GameButton[] = [];

  getX(): number {
    return this.x;
  }
  getY(): number {
    return this.y;
  }
  held(b: GameButton): boolean {
    return this.buttons.has(b);
  }
  pressed(b: GameButton): boolean {
    // A queued press is consumed once.
    const idx = this.pressQueue.indexOf(b);
    if (idx >= 0) {
      this.pressQueue.splice(idx, 1);
      return true;
    }
    return false;
  }
  press(b: GameButton): void {
    this.pressQueue.push(b);
  }
}

function testSpec() {
  return buildSpec({
    config: {
      WIDTH: 800,
      HEIGHT: 480,
      TITLE: 'Beat Streets',
      HEALTH_STAMINA_BAR_WIDTH: 235,
      HEALTH_STAMINA_BAR_HEIGHT: 26,
      INTRO_ENABLED: false,
      FLYING_KICK_VEL_X: 3,
      FLYING_KICK_VEL_Y: -8,
      JUMP_GRAVITY: 0.4,
      THROWN_GRAVITY: 0.025,
      WEAPON_GRAVITY: 0.5,
      BARREL_THROW_VEL_X: 4,
      BARREL_THROW_VEL_Y: 0,
      PLAYER_THROW_VEL_X: 5,
      PLAYER_THROW_VEL_Y: 0.5,
      BASE_STAMINA_DAMAGE_MULTIPLIER: 100,
      MIN_STAMINA: -100,
      DEBUG_LOGGING_ENABLED: false,
      DEBUG_SHOW_SCROLL_POS: false,
      DEBUG_SHOW_BOUNDARY: false,
      DEBUG_SHOW_ATTACKS: false,
      DEBUG_SHOW_TARGET_POS: false,
      DEBUG_SHOW_ANCHOR_POINTS: false,
      DEBUG_SHOW_HIT_AREA_WIDTH: false,
      DEBUG_SHOW_LOGS: false,
      DEBUG_SHOW_HEALTH_AND_STAMINA: false,
      DEBUG_PROFILING: false,
      SPECIAL_FONT_SYMBOLS: { xb_a: '%' },
      TITLE_PROMPT: 'PRESS % OR Z',
      TITLE_PROMPT_Y_OFFSET: 50,
      TITLE_LOGO_SWAP_FRAMES: 20,
      MIN_WALK_Y: 310,
      ENEMY_APPROACH_PLAYER_DISTANCE: 85,
      ENEMY_APPROACH_PLAYER_DISTANCE_SCOOTERBOY: 140,
      ENEMY_APPROACH_PLAYER_DISTANCE_BARREL: 180,
      ANCHOR_CENTRE: ['center', 'center'],
      ANCHOR_CENTRE_BOTTOM: ['center', 'bottom'],
      BACKGROUND_TILE_SPACING: 290,
      BACKGROUND_TILES: ['wall_end1'],
    },
    characters: {
      characters: {
        vax: { name: 'vax', attacks: ['vax_lpunch'], score: 20, health: 12, speed: [1.2, 1] },
      },
    },
    attacks: {
      punch: {
        name: 'punch',
        sprite: 'rpunch',
        strength: 1,
        anim_time: 18,
        frame_time: 6,
        frames: 3,
        hit_frames: [2],
        recovery_time: 0,
        reach: 80,
        throw: false,
        grab: false,
        combo_next: {},
        flying_kick: false,
        stamina_cost: 10,
        rear_attack: false,
        stamina_damage_multiplier: 1.5,
        stun_time_multiplier: 1,
      },
      vax_lpunch: {
        name: 'vax_lpunch',
        sprite: 'lpunch',
        strength: 1,
        anim_time: 18,
        frame_time: 6,
        frames: 3,
        hit_frames: [2],
        recovery_time: 50,
        reach: 80,
        throw: false,
        grab: false,
        combo_next: {},
        flying_kick: false,
        stamina_cost: 10,
        rear_attack: false,
        stamina_damage_multiplier: 1,
        stun_time_multiplier: 1,
      },
    },
    stages: {
      stages: [
        {
          max_scroll_x: 300,
          enemies: [{ type: 'EnemyVax', pos: [1000, 400] }],
          weapons: [],
          powerups: [],
        },
        {
          max_scroll_x: 600,
          enemies: [{ type: 'EnemyVax', pos: [1400, 400] }],
          weapons: [],
          powerups: [],
        },
      ],
    },
    story: { intro_prefix: '', stolen_items: [], intro_suffix: '', outro: '' },
  });
}

describe('Game engine', () => {
  it('jumpToStage spawns the stage enemies', () => {
    const game = new Game(testSpec(), new FakeControls());
    game.jumpToStage(1);
    expect(game.stageIndex).toBe(0);
    expect(game.enemies).toHaveLength(1);
    expect(game.enemies[0]).toBeInstanceOf(EnemyVax);
  });

  it('player attacks an enemy with button 0 and applies damage', () => {
    const game = new Game(testSpec(), new FakeControls());
    game.jumpToStage(1);
    const enemy = game.enemies[0];
    const before = enemy.health;

    // Place player right in front of the enemy, facing it. Both stay in the no-scroll
    // zone (screen x < WIDTH-300): past it, update() re-runs createStageObjects every
    // frame and the enemy under test would be replaced mid-fight.
    enemy.vpos.x = 520;
    game.player.vpos = new Vec2(460, enemy.vpos.y);
    game.player.facingX = 1;
    const controls = game.player.controls as FakeControls;
    controls.press(0);

    // Step frames until the attack lands.
    let landed = false;
    for (let i = 0; i < 20; i++) {
      game.update();
      if (enemy.health < before) {
        landed = true;
        break;
      }
    }
    expect(landed).toBe(true);
    expect(enemy.health).toBeLessThan(before);
  });

  it('killed enemies award score and are removed', () => {
    const game = new Game(testSpec(), new FakeControls());
    game.jumpToStage(1);
    const enemy = game.enemies[0];
    enemy.lives = 0;
    const scoreBefore = game.score;
    game.update();
    expect(game.score).toBe(scoreBefore + 20);
    expect(game.enemies).toHaveLength(0);
  });

  it('reaches the outro when all stages are cleared', () => {
    const game = new Game(testSpec(), new FakeControls());
    // Simulate beating both stages.
    game.stageIndex = game.stageCount() - 1;
    game.enemies = [];
    game.maxScrollOffsetX = 0;
    game.scrollOffset = new Vec2(0, 0);
    game.nextStage();
    expect(game.outroActive).toBe(true);
    expect(game.checkWon()).toBe(false); // outro text still active
  });

  it('scrolling advances the offset and boundary', () => {
    const game = new Game(testSpec(), new FakeControls());
    game.jumpToStage(1);
    const startX = game.scrollOffset.x;
    // Move player right so scrolling begins.
    game.player.vpos = new Vec2(900, 400);
    game.update();
    game.update();
    expect(game.scrollOffset.x).toBeGreaterThanOrEqual(startX);
    expect(game.boundary.left).toBe(game.scrollOffset.x);
  });

  it('player is a Fighter with health/stamina', () => {
    const game = new Game(testSpec(), new FakeControls());
    expect(game.player).toBeInstanceOf(Player);
    expect(game.player.health).toBe(30);
    expect(game.player.lives).toBe(3);
  });

  it('GOD MODE cheat: the player takes no damage', () => {
    const game = new Game(testSpec(), new FakeControls());
    game.jumpToStage(1);
    const enemy = game.enemies[0];
    // Place the enemy right in front of the player and set it attacking.
    enemy.vpos = new Vec2(game.player.vpos.x + 40, game.player.vpos.y);
    enemy.facingX = -1;
    game.cheatState.settings.godMode = true;
    const healthBefore = game.player.health;

    // Let the enemy land an attack on the player.
    let playerHit = false;
    for (let i = 0; i < 60; i++) {
      game.update();
      if (game.player.health < healthBefore) {
        playerHit = true;
        break;
      }
    }
    // With god mode, the player should be unharmed (and never report a hit).
    expect(game.player.health).toBe(healthBefore);
    expect(playerHit).toBe(false);
  });

  it('ONE PUNCH cheat: a player hit kills the enemy outright', () => {
    const game = new Game(testSpec(), new FakeControls());
    game.jumpToStage(1);
    const enemy = game.enemies[0];
    // No-scroll zone: see the damage test above (avoid per-frame createStageObjects).
    enemy.vpos.x = 520;
    game.player.vpos = new Vec2(460, enemy.vpos.y);
    game.player.facingX = 1;
    const controls = game.player.controls as FakeControls;
    game.cheatState.settings.onePunch = true;
    controls.press(0);

    for (let i = 0; i < 30; i++) {
      game.update();
    }
    // Enemy health should hit zero and the knock-out should start immediately.
    expect(enemy.health).toBe(0);
    expect(enemy.fallingState).toBe(FallingState.FALLING);
    // Removal happens after the fall-out animation (frame > 240 → lives 0 → despawn),
    // mirroring python's knockdown-then-despawn timing.
    for (let i = 0; i < 260 && game.enemies.includes(enemy); i++) {
      game.update();
    }
    expect(game.enemies).not.toContain(enemy);
  });
});

describe('Game story text (intro/outro)', () => {
  // Build a spec with intro enabled + story content.
  function storySpec() {
    const base = testSpec();
    return {
      ...base,
      config: { ...base.config, INTRO_ENABLED: true },
      story: {
        intro_prefix: 'THE EVIL BOSS STOLE ',
        stolen_items: ['THE TREASURE', 'THE MAP'],
        intro_suffix: '.\nFIGHT TO RECLAIM!',
        outro: 'YOU SAVED THE DAY.',
      },
    };
  }

  it('shows the intro text with a random stolen item when the game starts', () => {
    const game = new Game(storySpec(), new FakeControls());
    expect(game.textActive).toBe(true);
    expect(game.getIntroText()).toContain('THE EVIL BOSS STOLE');
    expect(game.getIntroText()).toContain('FIGHT TO RECLAIM!');
    expect(game.getIntroText()).toMatch(/THE TREASURE|THE MAP/);
  });

  it('typewriter-reveals the text over time and plays teletype sound', () => {
    const game = new Game(storySpec(), new FakeControls());
    // Advance ~30 frames; some of the intro should be displayed.
    for (let i = 0; i < 30; i++) game.update();
    expect(game.displayedText.length).toBeGreaterThan(0);
    expect(game.displayedText.length).toBeLessThanOrEqual(game.currentText.length);
    expect(game.sounds()).toContain('teletype');
  });

  it('skips the intro when a button is pressed', () => {
    const game = new Game(storySpec(), new FakeControls());
    const controls = game.player.controls as FakeControls;
    controls.press(0);
    game.update();
    expect(game.textActive).toBe(false);
  });

  it('shows the outro after the final stage is cleared', () => {
    const game = new Game(storySpec(), new FakeControls());
    // Skip intro.
    (game.player.controls as FakeControls).press(0);
    game.update();
    // Simulate completing the last stage.
    game.stageIndex = game.stageCount() - 1;
    game.enemies = [];
    game.maxScrollOffsetX = 0;
    game.scrollOffset = new Vec2(0, 0);
    game.nextStage();
    expect(game.outroActive).toBe(true);
    expect(game.textActive).toBe(true);
    expect(game.getOutroText()).toBe('YOU SAVED THE DAY.');
    expect(game.checkWon()).toBe(false); // outro still being read
  });

  it('wins only after the outro is dismissed', () => {
    const game = new Game(storySpec(), new FakeControls());
    (game.player.controls as FakeControls).press(0);
    game.update();
    game.stageIndex = game.stageCount() - 1;
    game.enemies = [];
    game.maxScrollOffsetX = 0;
    game.scrollOffset = new Vec2(0, 0);
    game.nextStage();
    // Dismiss the outro.
    (game.player.controls as FakeControls).press(0);
    game.update();
    expect(game.checkWon()).toBe(true);
  });
});
