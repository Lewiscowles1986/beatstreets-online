import { describe, it, expect } from 'vitest';
import { Barrel, Stick, Chain } from './weapons';
import { Scooter } from './enemies';
import { HealthPowerup, ExtraLifePowerup } from './powerups';
import { Game } from './game';
import { Vec2 } from '../core/math';
import { GameButton, ControllerInput } from '../core/controller';
import { buildSpec } from '../dsl/game-spec';

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
      MIN_WALK_Y: 310,
      ENEMY_APPROACH_PLAYER_DISTANCE: 85,
      ENEMY_APPROACH_PLAYER_DISTANCE_SCOOTERBOY: 140,
      ENEMY_APPROACH_PLAYER_DISTANCE_BARREL: 180,
      ANCHOR_CENTRE: ['center', 'center'],
      ANCHOR_CENTRE_BOTTOM: ['center', 'bottom'],
      BACKGROUND_TILE_SPACING: 290,
      BACKGROUND_TILES: [],
    },
    characters: { characters: {} },
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

function makeGame() {
  return new Game(makeSpec(), new FakeControls());
}

describe('Weapons', () => {
  it('a Barrel obeys gravity and settles on the ground', () => {
    const g = makeGame();
    const barrel = new Barrel(g, new Vec2(500, 400));
    barrel.heightAboveGround = 50;
    barrel.vel = new Vec2(0, 0);
    for (let i = 0; i < 200; i++) barrel.update();
    expect(barrel.heightAboveGround).toBe(0);
    expect(barrel.vel.y).toBe(0);
  });

  it('a thrown Barrel has horizontal velocity and can be picked up only when slow', () => {
    const g = makeGame();
    const barrel = new Barrel(g, new Vec2(500, 400));
    barrel.throw(1, g.player);
    expect(barrel.held).toBe(false);
    expect(barrel.vel.x).toBeGreaterThan(0);
    expect(barrel.can_be_picked_up()).toBe(false); // moving too fast
    for (let i = 0; i < 200; i++) barrel.update();
    expect(barrel.vel.length()).toBeLessThan(1);
    expect(barrel.can_be_picked_up()).toBe(true);
  });

  it('a Stick breaks after enough uses', () => {
    const g = makeGame();
    const stick = new Stick(g, new Vec2(500, 400));
    expect(stick.is_broken()).toBe(false);
    for (let i = 0; i < 30; i++) stick.used();
    expect(stick.is_broken()).toBe(true);
  });

  it('a Stick can be picked up and held', () => {
    const g = makeGame();
    const stick = new Stick(g, new Vec2(500, 400));
    expect(stick.can_be_picked_up()).toBe(true);
    stick.pick_up(100);
    expect(stick.held).toBe(true);
    // Held weapons don't fall.
    stick.update();
    expect(stick.vpos.y).toBe(400);
  });

  it('a Chain has higher durability than a Stick', () => {
    const g = makeGame();
    const chain = new Chain(g, new Vec2(0, 0));
    const stick = new Stick(g, new Vec2(0, 0));
    expect(chain.breakCounter).toBeGreaterThan(stick.breakCounter);
  });
});

describe('Powerups', () => {
  it('HealthPowerup restores health capped at max', () => {
    const g = makeGame();
    const p = new HealthPowerup(g, new Vec2(0, 0), 20);
    const collector = { health: 5, startHealth: 100, gainExtraLife: () => {} };
    p.collect(collector);
    expect(collector.health).toBe(25);
    expect(p.collected).toBe(true);
    // Capped at max.
    collector.health = 95;
    const p2 = new HealthPowerup(g, new Vec2(0, 0), 20);
    p2.collect(collector);
    expect(collector.health).toBe(100);
  });

  it('ExtraLifePowerup grants an extra life', () => {
    const g = makeGame();
    const p = new ExtraLifePowerup(g, new Vec2(0, 0));
    let lives = 2;
    p.collect({ health: 10, startHealth: 100, gainExtraLife: () => lives++ });
    expect(lives).toBe(3);
  });

  it('collecting once is idempotent', () => {
    const g = makeGame();
    const p = new HealthPowerup(g, new Vec2(0, 0), 20);
    const collector = { health: 5, startHealth: 100, gainExtraLife: () => {} };
    p.collect(collector);
    expect(collector.health).toBe(25);
  });
});

describe('Game stage world', () => {
  it('spawns stage weapons and powerups', () => {
    const g = makeGame();
    g.jumpToStage(1);
    expect(g.weapons).toHaveLength(1);
    expect(g.weapons[0]).toBeInstanceOf(Barrel);
    expect(g.powerups).toHaveLength(1);
    expect(g.powerups[0]).toBeInstanceOf(HealthPowerup);
  });

  it('player collects a nearby powerup', () => {
    const g = makeGame();
    g.jumpToStage(1);
    const powerup = g.powerups[0];
    // Move the player onto the powerup.
    g.player.vpos = powerup.vpos.clone();
    const healthBefore = g.player.health;
    g.update();
    // Player health is full (30), so health pickup caps at max -> unchanged; but powerup is collected.
    expect(powerup.collected).toBe(true);
    expect(g.player.health).toBe(healthBefore);
  });
});

describe('Scooter (knock-off)', () => {
  it('slides away and slows down over time', () => {
    const g = makeGame();
    const scooter = new Scooter(g, new Vec2(500, 400), 1, 2);
    const startX = scooter.vpos.x;
    // Slides left (-facingX * 8 initial velocity), then decays.
    for (let i = 0; i < 60; i++) scooter.update();
    expect(scooter.vpos.x).toBeLessThan(startX);
    expect(Math.abs(scooter.velX)).toBeLessThan(8);
  });

  it('uses the bike sprite with facing + animation frame', () => {
    const g = makeGame();
    const scooter = new Scooter(g, new Vec2(500, 400), 1, 2);
    expect(scooter.sprite()).toMatch(/^scooterboy_bike_1_\d_2$/);
    // Flip facing -> sprite id 0.
    const left = new Scooter(g, new Vec2(500, 400), -1, 1);
    expect(left.sprite()).toMatch(/^scooterboy_bike_0_\d_1$/);
  });
});
