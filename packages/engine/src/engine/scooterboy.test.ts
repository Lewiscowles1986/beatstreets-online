import { describe, it, expect } from 'vitest';
import { Game } from './game';
import { EnemyScooterboy } from './enemies';
import { EnemyState } from './enemy';
import { FallingState, Fighter } from './fighter';
import { GameButton, ControllerInput } from '../core/controller';
import { Vec2 } from '../core/math';
import { buildSpec } from '../dsl/game-spec';

/**
 * Frame-stepped sprite parity for the scooterboy against python's
 * EnemyScooterboy/Enemy.determine_sprite (beatstreets.py ~725/~1272). The user
 * reported the rider's initial frame looking off and the knock-off looking off —
 * these tests pin the exact python formulas per frame.
 */

class FakeControls implements ControllerInput {
  x = 0;
  y = 0;
  getX(): number {
    return this.x;
  }
  getY(): number {
    return this.y;
  }
  held(_b: GameButton): boolean {
    return false;
  }
  pressed(_b: GameButton): boolean {
    return false;
  }
}

function makeSpec() {
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
      SPECIAL_FONT_SYMBOLS: {},
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
      BACKGROUND_TILES: [],
    },
    characters: {
      characters: {
        vax: {
          name: 'vax',
          attacks: ['vax_lpunch'],
          approach_player_distance: 85,
          score: 100,
        },
        scooterboy: {
          name: 'scooterboy',
          attacks: ['scooterboy_attack1'],
          approach_player_distance: 140,
          score: 30,
          scooter_speed_slow: 4,
          scooter_speed_fast: 12,
          scooter_acceleration: 0.2,
          scooter_hit_attack: 'scooter_hit',
        },
      },
    },
    attacks: {},
    stages: {
      stages: [
        {
          max_scroll_x: 300,
          enemies: [{ type: 'EnemyVax', pos: [1000, 400] }],
          weapons: [{ type: 'Barrel', pos: [500, 400] }],
          powerups: [{ type: 'HealthPowerup', pos: [700, 400] }],
        },
      ],
    },
    story: { intro_prefix: '', stolen_items: [], intro_suffix: '', outro: '' },
  });
}

function makeGameWithScooterboy(): { game: Game; sb: EnemyScooterboy } {
  const game = new Game(makeSpec(), new FakeControls());
  game.jumpToStage(1);
  // Spawn the scooterboy exactly as the runtime stages.json does (stage 3: (200, 400)).
  game.spawnEnemy('EnemyScooterboy', new Vec2(200, 400));
  const sb = game.getEnemies().find((e): e is EnemyScooterboy => e instanceof EnemyScooterboy);
  if (!sb) throw new Error('spawnEnemy did not produce a scooterboy');
  return { game, sb };
}

describe('scooterboy sprite parity vs python determine_sprite', () => {
  it('riding: scooterboy_ride_{facing}_0 when cruising (initial frame)', () => {
    const { sb } = makeGameWithScooterboy();
    expect(sb.state).toBe(EnemyState.RIDING_SCOOTER);
    // Cruising (speed == target): python frame = 0, regardless of this.frame.
    sb.frame = 7;
    expect(sb.determineSprite()).toMatch(/^scooterboy_ride_[01]_0_\d$/);
  });

  it('riding: accelerating ride anim advances min(frame // 5, 2)', () => {
    const { sb } = makeGameWithScooterboy();
    // Force the accelerating condition (speed < target), python frame // 5 capped 2.
    sb.scooterTargetSpeed = sb.scooterSpeed + 5;
    for (const f of [0, 1, 4, 5, 9, 10, 14, 15, 30]) {
      sb.frame = f;
      const expected = Math.min(Math.floor(f / 5), 2);
      const m = sb.determineSprite().match(/^scooterboy_ride_([01])_(\d)_\d$/);
      expect(m, sb.determineSprite()).toBeTruthy();
      expect(Number(m![2]), `frame ${f} -> ${sb.determineSprite()}`).toBe(expected);
    }
  });

  it('riding: the base walk/attack branch does not run (override_walking)', () => {
    const { sb } = makeGameWithScooterboy();
    // Python override_walking() -> the standing/walking/attacking update is skipped;
    // this.frame must be untouched by the base update while riding.
    const before = sb.frame;
    sb.scooterSpeed = sb.scooterTargetSpeed; // not accelerating
    // Drive one base-class update through the public update() with riding active.
    // updateRiding may still move the rider (python does), but the walk-cycle frame
    // must not be reset to 7 by the standing branch.
    sb.update();
    // The ride anim frame only changes while accelerating; cruising keeps it.
    expect([before, before + 1]).toContain(sb.frame >= 0 ? sb.frame : before);
  });

  it('knocked off: knocked_off frame 0 for frames 0..10, then knockdown from frame 1', () => {
    const { sb } = makeGameWithScooterboy();
    // Mirror hit(): FALLING + the AI state leaves RIDING_SCOOTER (python's hit sets
    // falling_state and the state together — the sprite then falls through to the
    // knocked-off branch instead of the riding branch).
    sb.fallingState = FallingState.FALLING;
    sb.state = EnemyState.KNOCKED_DOWN;
    sb.justKnockedOffScooter = true;
    for (const f of [0, 5, 10]) {
      sb.frame = f;
      expect(sb.determineSprite()).toContain('_knocked_off_');
      expect(sb.determineSprite()).toMatch(/_knocked_off_[01]_0_\d$/);
    }
    // After the transition (the game loop clears the flag at frame > 10 and spawns
    // the Scooter), the knockdown animation CONTINUES FROM FRAME 1 — python comment:
    // "play knocked_off frame 0 before continuing from knockdown frame 1".
    sb.justKnockedOffScooter = false;
    for (const [f, expected] of [[15, 1], [25, 2], [35, 3]] as const) {
      sb.frame = f;
      const m = sb.determineSprite().match(/^scooterboy_knockdown_([01])_(\d)_\d$/);
      expect(m, sb.determineSprite()).toBeTruthy();
      expect(Number(m![2]), `frame ${f} -> ${sb.determineSprite()}`).toBe(expected);
    }
  });

  it('knockdown: scooterboy reaches frame 3 (python last_frame 3 for scooterboy)', () => {
    const { sb } = makeGameWithScooterboy();
    sb.fallingState = FallingState.FALLING;
    sb.state = EnemyState.KNOCKED_DOWN;
    sb.useDieAnimation = false;
    sb.justKnockedOffScooter = false;
    for (const f of [35, 90]) {
      sb.frame = f;
      const m = sb.determineSprite().match(/^scooterboy_knockdown_([01])_(\d)_\d$/);
      expect(m, sb.determineSprite()).toBeTruthy();
      expect(Number(m![2]), `frame ${f} -> ${sb.determineSprite()}`).toBe(3);
    }
    // A non-scooterboy enemy still caps at 2 (the hook default).
    const vax = game1();
    function game1(): Fighter {
      const g = new Game(makeSpec(), new FakeControls());
      g.jumpToStage(1);
      return g.getEnemies()[0];
    }
    vax.fallingState = FallingState.FALLING;
    vax.useDieAnimation = false;
    vax.frame = 35;
    const mv = vax.determineSprite().match(/_knockdown_([01])_(\d)_/);
    expect(mv, vax.determineSprite()).toBeTruthy();
    expect(Number(mv![2])).toBe(2);
  });

  it('death flash: hidden when frame > 60, health <= 0 and (frame // 10) % 2 == 0', () => {
    const { sb } = makeGameWithScooterboy();
    sb.fallingState = FallingState.FALLING;
    sb.state = EnemyState.KNOCKED_DOWN;
    sb.useDieAnimation = false;
    sb.justKnockedOffScooter = false;
    sb.health = 0;
    sb.frame = 65; // 65 // 10 = 6 (even) -> hidden
    expect(sb.determineSprite()).toBe('blank');
    sb.frame = 70; // 70 // 10 = 7 (odd) -> visible
    expect(sb.determineSprite()).not.toBe('blank');
    sb.frame = 40; // flash window not entered yet
    expect(sb.determineSprite()).not.toBe('blank');
  });
});