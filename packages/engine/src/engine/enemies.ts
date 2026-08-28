import { Enemy, EnemyState } from './enemy';
import { GameContext, FallingState } from './fighter';
import { Character } from '../dsl/characters';
import { Vec2 } from '../core/math';
import { Attack } from './attack';
import { Stick } from './weapons';

/**
 * Concrete enemies. Character tuning (attacks, health, speed, score) comes from the
 * DSL `characters` data; per-instance values (position, colour variant, start timer)
 * are runtime params — matching how the Python game builds enemies from JSON.
 */

export class EnemyVax extends Enemy {
  constructor(game: GameContext, char: Character, pos: Vec2, opts: { startTimer?: number; colourVariant?: number } = {}) {
    super(game, char, pos, {
      startTimer: opts.startTimer ?? 20,
      colourVariant: opts.colourVariant ?? game.rng.randint(0, 2),
    });
  }
}

export class EnemyHoodie extends Enemy {
  constructor(game: GameContext, char: Character, pos: Vec2, opts: { startTimer?: number; colourVariant?: number } = {}) {
    super(game, char, pos, {
      startTimer: opts.startTimer ?? 20,
      colourVariant: opts.colourVariant ?? game.rng.randint(0, 2),
    });
  }

  /** Python beatstreets.py ~1242: on death, chance of dropping a stick. */
  override died(): void {
    super.died();
    if (this.game.rng.randint(0, 2) === 0) {
      this.game.weapons.push(new Stick(this.game, this.vpos.clone()));
    }
  }
}

/** Scooterboy rides a scooter until knocked off, then behaves like a normal enemy. */
export class EnemyScooterboy extends Enemy {
  scooterSpeed: number;
  scooterTargetSpeed: number;
  private slowSpeed: number;
  private fastSpeed: number;
  private acceleration: number;

  constructor(
    game: GameContext,
    char: Character,
    pos: Vec2,
    opts: { startTimer?: number; colourVariant?: number } = {},
  ) {
    super(game, char, pos, {
      startTimer: opts.startTimer ?? 20,
      colourVariant: opts.colourVariant ?? game.rng.randint(0, 2),
    });
    this.state = EnemyState.RIDING_SCOOTER;
    this.slowSpeed = char.scooter_speed_slow ?? 4;
    this.fastSpeed = char.scooter_speed_fast ?? 12;
    this.acceleration = char.scooter_acceleration ?? 0.2;
    this.scooterSpeed = this.slowSpeed;
    this.scooterTargetSpeed = this.scooterSpeed;
  }

  override makeDecision(): void {
    if (this.state !== EnemyState.RIDING_SCOOTER) super.makeDecision();
  }

  /** Python override_walking: the riding state is managed entirely by updateRiding —
   *  the base walk/attack branch must not run (it would reset the ride-anim frame). */
  protected override overrideWalking(): boolean {
    return this.state === EnemyState.RIDING_SCOOTER;
  }

  /** Python: the scooterboy's knockdown animation has one extra frame. */
  protected override knockdownLastFrame(): number {
    return 3;
  }

  /** Python: riding uses scooterboy_ride_{facing}_{frame}_{variant}; frame is 0
   *  unless currently speeding up (then min(frame // 5, 2)). */
  override determineSprite(): string {
    if (this.state === EnemyState.RIDING_SCOOTER) {
      const facingId = this.facingX === 1 ? 1 : 0;
      const frame = this.scooterSpeed < this.scooterTargetSpeed ? Math.min(Math.floor(this.frame / 5), 2) : 0;
      return `scooterboy_ride_${facingId}_${frame}_${this.colourVariant ?? 0}`;
    }
    return super.determineSprite();
  }

  override update(): void {
    if (this.state === EnemyState.RIDING_SCOOTER) {
      this.updateRiding();
    }
    super.update();
  }

  private updateRiding(): void {
    const player = this.game.getPlayer();
    // Accelerate / decelerate toward target speed.
    if (this.scooterSpeed !== this.scooterTargetSpeed) {
      this.scooterSpeed = moveToward(this.scooterSpeed, this.scooterTargetSpeed, this.acceleration);
      this.frame += 1;
    } else if (this.game.rng.randint(0, 30) === 0) {
      this.scooterTargetSpeed = this.fastSpeed;
      this.frame = 0;
    }
    // Move forward.
    this.target.x = this.vpos.x + this.facingX * this.scooterSpeed;
    this.vpos.x = this.target.x;

    // Turn around at screen edges.
    if ((this.facingX > 0 && this.vpos.x - this.game.scrollX() > 800 + 200) || (this.facingX < 0 && this.vpos.x - this.game.scrollX() < -200)) {
      this.facingX = -this.facingX;
      this.target.y = player.vpos.y;
      // Python: if the player is standing, jump to the player's Y; otherwise pick a
      // random Y at least 40px away (the randint draws are RNG-stream relevant).
      if (player.fallingState === FallingState.STANDING) {
        this.vpos.y = this.target.y;
      } else {
        while (Math.abs(this.vpos.y - this.target.y) < 40) {
          this.vpos.y = this.game.rng.randint(this.game.config.MIN_WALK_Y, this.game.config.HEIGHT - 1);
        }
      }
      this.scooterTargetSpeed = this.slowSpeed;
      this.scooterSpeed = this.scooterTargetSpeed;
    }

    // Collide with the player.
    if (
      player.fallingState === FallingState.STANDING &&
      Math.abs(player.vpos.y - this.vpos.y) < 30 &&
      Math.abs(this.vpos.x - player.vpos.x) < 60 &&
      player.heightAboveGround < 20
    ) {
      const hit = this.game.getAttack('scooter_hit');
      if (hit) player.hit(this, new Attack(hit));
    }
  }

  override getDesiredFacing(): number | null {
    return this.facingX;
  }

  override hit(hitter: unknown, attack: Attack): void {
    super.hit(hitter, attack);
    if (this.state === EnemyState.RIDING_SCOOTER) {
      this.fallingState = FallingState.FALLING;
      this.frame = 0;
      this.justKnockedOffScooter = true;
      this.state = EnemyState.KNOCKED_DOWN;
    }
  }
}

/** A lone scooter after its rider has been knocked off — slides away and slows down. */
export class Scooter {
  vpos: Vec2;
  facingX: number;
  colourVariant: number;
  velX: number;
  frame = 0;

  constructor(game: GameContext, pos: Vec2, facingX: number, colourVariant: number) {
    this.vpos = pos;
    this.facingX = facingX;
    this.colourVariant = colourVariant;
    this.velX = -facingX * 8;
    game.playSound('scooter_fall');
  }

  update(): void {
    this.frame += 1;
    this.vpos.x += this.velX;
    this.velX *= 0.94;
  }

  /** The bike sprite for the current animation frame. */
  sprite(): string {
    const facingId = this.facingX > 0 ? 1 : 0;
    return `scooterboy_bike_${facingId}_${Math.min(Math.floor(this.frame / 30), 2)}_${this.colourVariant}`;
  }

  /**
   * Python `Scooter.get_draw_order_offset` = -1: the riderless bike sorts BEHIND the
   * character at the same y, so it never paints over the (fallen) rider.
   */
  getDrawOrderOffset(): number {
    return -1;
  }
}

function moveToward(n: number, target: number, speed: number): number {
  if (n < target) return Math.min(n + speed, target);
  if (n > target) return Math.max(n - speed, target);
  return n;
}

/** The final boss — more health/stamina, grab+throw attack. */
export class EnemyBoss extends Enemy {
  constructor(game: GameContext, char: Character, pos: Vec2, opts: { startTimer?: number; colourVariant?: number } = {}) {
    super(game, char, pos, {
      startTimer: opts.startTimer ?? 20,
      colourVariant: opts.colourVariant ?? game.rng.randint(0, 2),
    });
  }

  protected override onGrabAttack(): void {
    const player = this.game.getPlayer();
    if (player.fallingState === FallingState.STANDING || player.fallingState === FallingState.GRABBED) {
      player.grabbed();
    }
  }

  protected override onThrowGrab(): void {
    const player = this.game.getPlayer();
    if (player.fallingState === FallingState.GRABBED) {
      player.hit(this, this.lastAttack ?? new Attack(this.game.getAttack('boss_grab_player')!));
      player.thrown(this.facingX);
    }
  }
}

/**
 * A spawn portal that periodically produces enemies (python `EnemyPortal`).
 *
 * Lifecycle, mirroring the Python class:
 *   * Starts in PAUSE for `startTimer` frames, showing the `portal_grow_*` animation.
 *   * Then settles into the PORTAL state: every `spawnInterval` frames (growing by
 *     `spawnIntervalChange` up to `maxSpawnInterval` — spawns get LESS frequent over
 *     time) it plays the two-phase generate animation. Phase 1 (the last
 *     GENERATE_ANIMATION_TIME frames of the interval) picks the enemy with an RNG
 *     `choice` (the enemy's constructor draws its own colour variant, `randint(0,2)`)
 *     and plays `portal_generate_<enemy>_<facing>_<frame>_<variant>`. Phase 2 actually
 *     adds the enemy to the level. If the level already holds `maxEnemies` enemies the
 *     portal retries in 60 frames.
 *   * Takes damage like any enemy (half_hit_area 50x50) but never falls: at
 *     health <= 0 it plays `portal_destroyed_*` for ~50 frames, loses its last life
 *     and is removed by the game loop.
 */
export class EnemyPortal extends Enemy {
  private static readonly GENERATE_ANIMATION_DIVISOR = 16;
  /** 6 frames of generate animation at 16 frames each (python GENERATE_ANIMATION_TIME). */
  private static readonly GENERATE_ANIMATION_TIME = 6 * 16;

  private spawnList: string[];
  private spawnInterval: number;
  private spawnIntervalChange: number;
  private maxSpawnInterval: number;
  private maxEnemies: number;
  private spawnTimer: number;
  /** The enemy being generated by the animation — not yet in the level. */
  private spawningEnemy: Enemy | null = null;
  /** Direction the spawned enemy will face: 0 = left, 1 = right (python spawn_facing). */
  private spawnFacing = 0;

  constructor(
    game: GameContext,
    char: Character,
    pos: Vec2,
    opts: {
      startTimer?: number;
      spawns?: string[];
      spawnInterval?: number;
      spawnIntervalChange?: number;
      maxSpawnInterval?: number;
      maxEnemies?: number;
    } = {},
  ) {
    super(game, char, pos, { startTimer: opts.startTimer ?? 90 });
    this.spawnList = opts.spawns ?? [];
    this.spawnInterval = opts.spawnInterval ?? 120;
    this.spawnIntervalChange = opts.spawnIntervalChange ?? 0;
    this.maxSpawnInterval = opts.maxSpawnInterval ?? 250;
    this.maxEnemies = opts.maxEnemies ?? 5;
    this.spawnTimer = this.spawnInterval;
  }

  protected override isPortal(): boolean {
    return true;
  }

  override spawned(): void {
    this.game.playSound('portal_appear');
  }

  // Like all enemies, portals start in the PAUSE state until their start_timer expires.
  override makeDecision(): void {
    this.state = EnemyState.PORTAL;
  }

  // A portal never walks — the Fighter update must skip the standing/walking branch.
  protected override overrideWalking(): boolean {
    return true;
  }

  override update(): void {
    this.frame += 1;

    if (this.state === EnemyState.PORTAL) {
      if (this.health <= 0) {
        this.state = EnemyState.PORTAL_EXPLODE;
        this.frame = 0;
        this.game.playSound('portal_destroyed');
      } else {
        this.spawnTimer -= 1;
        if (this.spawnTimer <= 0 && this.spawningEnemy !== null) {
          // Animation complete, actually put the enemy in the level.
          this.game.spawnEnemyObject(this.spawningEnemy);
          this.spawningEnemy = null;
          // Reset spawn timer, depending on spawn_interval_change we may spawn less
          // frequently as time goes on (python: interval += change, capped at max).
          this.spawnInterval = Math.min(this.spawnInterval + this.spawnIntervalChange, this.maxSpawnInterval);
          this.spawnTimer = this.spawnInterval;
        } else if (this.spawningEnemy === null && this.spawnTimer <= EnemyPortal.GENERATE_ANIMATION_TIME) {
          if (this.game.getEnemies().length >= this.maxEnemies) {
            // Too many enemies to spawn at the moment, try again in one second.
            this.spawnTimer = 60;
          } else {
            // Randomly choose an enemy to spawn from our enemies list (python draws
            // `choice` here; the enemy constructor then draws its colour variant).
            const name = this.game.rng.choice(this.spawnList);
            this.spawnFacing = this.vpos.x > this.player().vpos.x ? 0 : 1;
            // Instantiate the enemy, but it won't appear in the level until the
            // animation is complete.
            this.spawningEnemy = this.game.createSpawnedEnemy(name, this.vpos.clone());
            // Reset frame for spawning animation.
            this.frame = 0;
            this.game.playSound('portal_enemy_spawn');
          }
        }
      }
    } else if (this.state === EnemyState.PORTAL_EXPLODE) {
      if (this.frame > 50) {
        this.lives -= 1;
        this.died();
      }
    }

    super.update();
  }

  override determineSprite(): string {
    if (this.state === EnemyState.PAUSE && Math.floor(this.frame / 8) < 4) {
      return `portal_grow_${Math.min(Math.floor(this.frame / 8), 3)}`;
    }
    if (this.state === EnemyState.PORTAL_EXPLODE) {
      return `portal_destroyed_${Math.min(Math.floor(this.frame / 6), 7)}`;
    }
    if (this.spawningEnemy !== null) {
      // 3 frames of neutral generate animation, then 3 frames of animation for
      // generating the specific enemy.
      const frame = Math.floor(this.frame / EnemyPortal.GENERATE_ANIMATION_DIVISOR);
      if (frame < 3) return `portal_generate_${frame}`;
      const f = Math.min(frame - 3, 2);
      const e = this.spawningEnemy;
      return `portal_generate_${e.sprite}_${this.spawnFacing}_${f}_${e.colourVariant}`;
    }
    if (this.hitTimer > 0) return 'portal_hit_0';
    return `portal_idle_${Math.floor(this.frame / 8) % 8}`;
  }

  protected override determineAttack(): Attack | null {
    return null;
  }
}
