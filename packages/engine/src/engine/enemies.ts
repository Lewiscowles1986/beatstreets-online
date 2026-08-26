import { Enemy, EnemyState } from './enemy';
import { GameContext, FallingState } from './fighter';
import { Character } from '../dsl/characters';
import { Vec2 } from '../core/math';
import { Attack } from './attack';

/**
 * Concrete enemies. Character tuning (attacks, health, speed, score) comes from the
 * DSL `characters` data; per-instance values (position, colour variant, start timer)
 * are runtime params — matching how the Python game builds enemies from JSON.
 */

export class EnemyVax extends Enemy {
  constructor(game: GameContext, char: Character, pos: Vec2, opts: { startTimer?: number } = {}) {
    super(game, char, pos, { startTimer: opts.startTimer ?? 20, colourVariant: Math.floor(Math.random() * 3) });
  }
}

export class EnemyHoodie extends Enemy {
  constructor(game: GameContext, char: Character, pos: Vec2, opts: { startTimer?: number } = {}) {
    super(game, char, pos, { startTimer: opts.startTimer ?? 20, colourVariant: Math.floor(Math.random() * 3) });
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
    opts: { startTimer?: number } = {},
  ) {
    super(game, char, pos, { startTimer: opts.startTimer ?? 20, colourVariant: Math.floor(Math.random() * 3) });
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
    } else if (Math.random() < 1 / 30) {
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
}

function moveToward(n: number, target: number, speed: number): number {
  if (n < target) return Math.min(n + speed, target);
  if (n > target) return Math.max(n - speed, target);
  return n;
}

/** The final boss — more health/stamina, grab+throw attack. */
export class EnemyBoss extends Enemy {
  constructor(game: GameContext, char: Character, pos: Vec2, opts: { startTimer?: number } = {}) {
    super(game, char, pos, { startTimer: opts.startTimer ?? 20 });
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

/** A spawn portal that periodically produces enemies. */
export class EnemyPortal extends Enemy {
  private spawnList: string[];
  private spawnInterval: number;
  private spawnIntervalChange: number;
  private maxSpawnInterval: number;
  private maxEnemies: number;
  private currentInterval: number;

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
    this.state = EnemyState.PORTAL;
    this.spawnList = opts.spawns ?? [];
    this.spawnInterval = opts.spawnInterval ?? 120;
    this.spawnIntervalChange = opts.spawnIntervalChange ?? 0;
    this.maxSpawnInterval = opts.maxSpawnInterval ?? 250;
    this.maxEnemies = opts.maxEnemies ?? 5;
    this.currentInterval = this.spawnInterval;
  }

  protected override isPortal(): boolean {
    return true;
  }

  override update(): void {
    this.stateTimer -= 1;
    if (this.stateTimer <= 0) {
      this.stateTimer = this.currentInterval;
      const enemies = this.game.getEnemies();
      const existing = enemies.filter((e) => e instanceof EnemyPortal).length;
      if (existing < this.maxEnemies && this.spawnList.length > 0) {
        const name = this.spawnList[Math.floor(Math.random() * this.spawnList.length)];
        this.game.spawnEnemy(name, this.vpos.clone());
      }
      // Spawn rate increases over time.
      this.currentInterval = Math.max(
        this.spawnInterval,
        Math.min(this.currentInterval + this.spawnIntervalChange, this.maxSpawnInterval),
      );
    }
  }

  protected override determineAttack(): Attack | null {
    return null;
  }
}
