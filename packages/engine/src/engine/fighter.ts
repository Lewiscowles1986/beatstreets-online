import { Vec2, sign } from '../core/math';
import { Rng } from '../core/prng';
import { Attack } from './attack';
import { GameConfig } from '../dsl/config';

/** The subset of game state a Fighter reads/writes. Decoupled so logic is testable. */
export interface GameContext {
  config: GameConfig;
  boundary: { left: number; right: number; top: number; bottom: number };
  weapons: WeaponLike[];
  /** The game's shared RNG — all randomness flows through this for determinism. */
  rng: Rng;
  playSound(name: string, variants?: number): void;
  getEnemies(): Fighter[];
  getPlayer(): Fighter;
  getAttack(name: string): import('../dsl/attacks').AttackSpec | undefined;
  /** Current horizontal scroll offset of the world. */
  scrollX(): number;
  /** Spawn an enemy by name at a position (used by portals). */
  spawnEnemy(name: string, pos: Vec2): void;
  /** Build a portal-spawned enemy WITHOUT adding it to the level (draws its colour
   *  variant inside the seeded RNG stream — python constructs the enemy class). */
  createSpawnedEnemy(name: string, pos: Vec2): import('./enemy').Enemy | null;
  /** Add an already-built enemy to the level (python `Game.spawn_enemy`). */
  spawnEnemyObject(enemy: import('./enemy').Enemy): void;
  /** Live cheat settings (god mode / one punch). */
  cheat(): { godMode: boolean; onePunch: boolean };
}

/** A weapon/pickup the fighter can hold or throw (duck-typed). */
export interface WeaponLike {
  name: string;
  vpos: Vec2;
  throw(facingX: number, thrower: unknown): void;
  pick_up(height: number): void;
  dropped(): void;
  can_be_picked_up(): boolean;
  is_broken(): boolean;
  /** Python end_pickup_frame: the pickup animation's last sprite frame. */
  endPickupFrame: number;
  /** Python get_draw_order_offset: draw sort nuance (base 0, barrel +2, breakable -50). */
  getDrawOrderOffset(): number;
  /** A weapon may break after being used to hit. */
  used?(): void;
}

/** Sort/draw-order nuance: objects lower on screen are drawn in front. */
export interface DrawOrderable {
  getDrawOrderOffset(): number;
}

/** The states a fighter can be in (knocked down, thrown, grabbed, ...). */
export enum FallingState {
  STANDING = 0,
  FALLING = 1,
  GETTING_UP = 2,
  GRABBED = 3,
  THROWN = 4,
}

export abstract class Fighter {
  static readonly WEAPON_HOLD_HEIGHT = 100;

  /** Virtual (world) position; rendering subtracts the scroll offset. */
  vpos: Vec2;
  heightAboveGround = 0;

  /**
   * Vertical anchor offset (px from the sprite's top) used when drawing, mirroring
   * the Python `anchor=("center", anchor_y)` convention. The render layer subtracts
   * this from the sprite's top so the anchor point lands on `vpos`.
   */
  anchorY: number;

  speed: Vec2;
  sprite: string;
  animUpdateRate: number;
  facingX = 1;
  frame = 0;
  lastAttack: Attack | null = null;
  attackTimer = 0;
  fallingState = FallingState.STANDING;
  walking = false;
  vel = new Vec2(0, 0);
  pickupAnimation: string | null = null;
  hitTimer = 0;
  hitFrame = 0;
  stamina: number;
  maxStamina: number;
  halfHitArea: Vec2;
  health: number;
  startHealth: number;
  lives: number;
  colourVariant: number | null;
  hitSound?: string;
  weapon: WeaponLike | null = null;
  justKnockedOffScooter = false;
  useDieAnimation = false;

  protected game: GameContext;

  constructor(
    game: GameContext,
    pos: Vec2,
    speed: Vec2,
    sprite: string,
    health: number,
    opts: {
      anchorY?: number;
      animUpdateRate?: number;
      stamina?: number;
      halfHitArea?: Vec2;
      lives?: number;
      colourVariant?: number | null;
      hitSound?: string;
    } = {},
  ) {
    this.game = game;
    this.vpos = pos;
    this.speed = speed;
    this.sprite = sprite;
    this.anchorY = opts.anchorY ?? 256;
    this.animUpdateRate = opts.animUpdateRate ?? 8;
    this.stamina = opts.stamina ?? 500;
    this.maxStamina = this.stamina;
    this.halfHitArea = opts.halfHitArea ?? new Vec2(25, 20);
    this.health = health;
    this.startHealth = health;
    this.lives = opts.lives ?? 1;
    this.colourVariant = opts.colourVariant ?? null;
    this.hitSound = opts.hitSound;
  }

  update(): void {
    const cfg = this.game.config;
    this.attackTimer -= 1;

    // Gravity / air physics.
    if (this.heightAboveGround > 0 || this.vel.y !== 0) {
      this.vpos.x += this.vel.x;
      this.vel.y += this.fallingState === FallingState.THROWN ? cfg.THROWN_GRAVITY : cfg.JUMP_GRAVITY;
      this.heightAboveGround -= this.vel.y;
      this.applyMovementBoundaries(this.vel.x, 0);
      if (this.heightAboveGround < 0) {
        this.heightAboveGround = 0;
        this.vel.x = 0;
        this.vel.y = 0;
        this.hitTimer = 0;
      }
    }

    // Falling / dying.
    if (this.fallingState === FallingState.FALLING) {
      this.vpos.x += this.vel.x;
      this.vel.x = moveTowards(this.vel.x, 0, 0.5)[0];
      this.applyMovementBoundaries(this.vel.x, 0);
      this.frame += 1;
      if (this.frame > 120) {
        if (this.health > 0) {
          this.fallingState = FallingState.GETTING_UP;
          this.frame = 0;
          this.stamina = this.maxStamina;
        } else if (this.frame > 240) {
          this.lives -= 1;
          if (this.lives > 0) {
            this.health = this.startHealth;
            this.fallingState = FallingState.GETTING_UP;
            this.frame = 0;
            this.stamina = this.maxStamina;
            this.useDieAnimation = false;
          } else {
            this.died();
          }
        }
      }
    } else if (this.fallingState === FallingState.GETTING_UP) {
      this.frame += 1;
      this.vpos.x += 0.1 * this.facingX;
      if (this.frame > 20) {
        this.fallingState = FallingState.STANDING;
        this.frame = 0;
      }
    } else if (this.fallingState === FallingState.THROWN) {
      this.frame += 1;
      if (this.heightAboveGround <= 0) {
        this.fallingState = FallingState.FALLING;
        this.frame = 80;
      }
    } else if (this.hitTimer > 0) {
      this.hitTimer -= 1;
    } else if (this.pickupAnimation !== null) {
      this.frame += 1;
      if (this.frame > 30) this.pickupAnimation = null;
    } else if (this.overrideWalking()) {
      // special state managed by a subclass (e.g. riding scooter)
    } else if (this.fallingState === FallingState.STANDING) {
      this.updateStanding();
    }
  }

  private updateStanding(): void {
    const cfg = this.game.config;

    // Recover stamina over time.
    if (this.stamina < this.maxStamina) this.stamina += 1;

    // Keep held weapon in position.
    if (this.weapon) {
      this.weapon.vpos = this.vpos.add(new Vec2(this.facingX * 20, 0));
    }

    // Ready to attack / pick-up / drop?
    let lastRecovery = this.lastAttack ? this.lastAttack.recoveryTime : 0;
    if (this.stamina <= 0) lastRecovery *= 3;
    if (this.attackTimer <= -lastRecovery) {
      // Pick up a weapon.
      if (this.weapon === null) {
        const nearby = this.game.weapons.filter((w) => w.vpos.sub(this.vpos).length() < 50);
        if (nearby.length > 0 && this.determinePickUpWeapon()) {
          nearby.sort((a, b) => a.vpos.sub(this.vpos).length() - b.vpos.sub(this.vpos).length());
          for (const weapon of nearby) {
            if (weapon.can_be_picked_up()) {
              this.pickupAnimation = weapon.name;
              this.frame = 0;
              this.weapon = weapon;
              weapon.pick_up(Fighter.WEAPON_HOLD_HEIGHT);
              break;
            }
          }
        }
      } else if (this.determineDropWeapon()) {
        this.dropWeapon();
      }

      // Attack (unless we just started a pickup).
      if (this.pickupAnimation === null) {
        const attack = this.determineAttack();
        if (attack) {
          this.lastAttack = attack;
          this.attackTimer = attack.animTime;
          this.stamina = Math.max(this.stamina - attack.staminaCost, cfg.MIN_STAMINA);
          this.frame = 0;
          if (attack.initialSound) this.game.playSound(attack.initialSound[0], attack.initialSound[1]);

          if (attack.flyingKick) {
            this.vel.x = cfg.FLYING_KICK_VEL_X * this.facingX;
            this.vel.y = cfg.FLYING_KICK_VEL_Y;
          }
          if (attack.grab) this.onGrabAttack();
        }
      }
    }

    // Movement / animation.
    if (this.attackTimer <= 0) {
      // Not attacking.
      const desiredFacing = this.getDesiredFacing();
      if (desiredFacing !== null) this.facingX = desiredFacing;

      const target = this.getMoveTarget();
      if (!target.equals(this.vpos)) {
        this.walking = true;
        const [nx, dx] = moveTowards(this.vpos.x, target.x, this.speed.x);
        const [ny, dy] = moveTowards(this.vpos.y, target.y, this.speed.y);
        this.vpos.x = nx;
        this.vpos.y = ny;
        this.applyMovementBoundaries(dx, dy);
        this.frame += 1;
      } else {
        this.walking = false;
        this.frame = 7;
      }
    } else {
      // Attacking.
      this.frame += 1;
      const attackFrame = this.lastAttack!.frameAt(this.frame);
      // Python: `if frame in self.last_attack.hit_frames` — VALUE membership. JS `in`
      // on an array checks INDICES (`0 in [2]` is true), which landed every hit on the
      // attack's first animation frame; use includes() to mirror python.
      if (this.lastAttack!.hitFrames.includes(attackFrame)) {
        if (this.lastAttack!.throw) {
          if (this.lastAttack!.grab) {
            this.onThrowGrab();
          } else if (this.weapon) {
            this.weapon.throw(this.facingX, this);
            this.weapon = null;
          }
        }
        this.attack(this.lastAttack!);
      }
    }
  }

  /** Resolve whether this attack hits an opponent this frame. */
  attack(attack: Attack): void {
    if (attack.strength > 0) {
      for (const opponent of this.getOpponents()) {
        const vec = opponent.vpos.sub(this.vpos);
        let facingCorrect = sign(this.facingX) === sign(vec.x);
        if (attack.rearAttack) facingCorrect = !facingCorrect;
        if (
          Math.abs(vec.y) < opponent.halfHitArea.y &&
          facingCorrect &&
          Math.abs(vec.x) < attack.reach + opponent.halfHitArea.x
        ) {
          opponent.hit(this, attack);

          // ONE PUNCH cheat: any player->enemy hit kills the enemy outright. Skip
          // enemies that are already dead — a corpse must not be reset/killed again.
          if (this.game.cheat().onePunch && this.isPlayer() && opponent.isEnemy() && !opponent.isPortal() && opponent.lives > 0) {
            opponent.health = 0;
            opponent.stamina = 0;
            opponent.lives = 1;
            opponent.fallingState = FallingState.FALLING;
            opponent.frame = 0;
            opponent.useDieAnimation = this.game.rng.random() < 0.5;
          }

          if (this.weapon && this.weapon.is_broken()) this.dropWeapon();
        }
      }
    }
  }

  /** Take damage. hitter may be a Fighter or a thrown weapon (barrel). */
  hit(hitter: unknown, attack: Attack): void {
    const cfg = this.game.config;
    // DEAD (out of lives): hard-inert. The dying fall is already unhittable via the
    // falling-state guard, but residual windows (e.g. the one-punch cheat's post-hit
    // reset, the 50-frame portal explosion) could still land damage/reactions on a
    // corpse — a dead fighter takes nothing, ever (gauntlet 025: user report).
    if (this.lives <= 0) return;
    if (this.fallingState !== FallingState.STANDING && this.fallingState !== FallingState.GRABBED) return;
    // GOD MODE cheat: the player never takes damage.
    if (this.game.cheat().godMode && this.isPlayer()) return;
    if (this.hitTimer <= 0) {
      this.stamina = Math.max(
        this.stamina - attack.strength * cfg.BASE_STAMINA_DAMAGE_MULTIPLIER * attack.staminaDamageMultiplier,
        cfg.MIN_STAMINA,
      );
      this.health -= attack.strength;
      this.hitTimer = attack.strength * 8 * attack.stunTimeMultiplier;
      this.hitFrame = this.game.rng.randint(0, 1);
      // Cancel an ongoing (non-flying-kick) attack.
      if (this.attackTimer > 0 && this.lastAttack && !this.lastAttack.flyingKick) this.attackTimer = 0;
      if (this.weapon) this.dropWeapon();
      if (attack.hitSound) this.game.playSound(attack.hitSound[0], attack.hitSound[1]);
      if (this.hitSound) this.game.playSound(this.hitSound);

      if ((this.stamina <= 0 || this.health <= 0) && !this.isPortal()) {
        this.fallingState = FallingState.FALLING;
        this.frame = 0;
        this.hitTimer = 0;
        if (this.health < 3) {
          this.health = 0;
          this.useDieAnimation = this.game.rng.randint(0, 1) === 0;
        }
      }
      if (hitter instanceof Fighter && hitter.weapon) hitter.weapon.used?.();
    }
    // Always face the hitter.
    if (hitter instanceof Fighter && hitter.vpos.x !== this.vpos.x) {
      this.facingX = sign(hitter.vpos.x - this.vpos.x);
      if (this.fallingState === FallingState.FALLING && !this.useDieAnimation) {
        this.vel.x += -this.facingX * 10;
      }
    }
  }

  /** Called when out of lives; overridable by subclasses. */
  protected died(): void {}

  protected onGrabAttack(): void {}

  protected onThrowGrab(): void {}

  protected isPortal(): boolean {
    return false;
  }

  dropWeapon(): void {
    this.pickupAnimation = null;
    this.weapon?.dropped();
    this.weapon = null;
  }

  grabbed(): void {
    this.fallingState = FallingState.GRABBED;
    if (this.weapon) this.dropWeapon();
  }

  thrown(dirX: number): void {
    const cfg = this.game.config;
    this.fallingState = FallingState.THROWN;
    this.vel.x = dirX * cfg.PLAYER_THROW_VEL_X;
    this.vel.y = cfg.PLAYER_THROW_VEL_Y;
    this.facingX = -dirX;
    this.vpos.x += dirX * 50;
    this.heightAboveGround = 45;
  }

  applyMovementBoundaries(dx: number, dy: number): void {
    const b = this.game.boundary;
    if (dx < 0 && this.vpos.x < b.left) this.vpos.x = b.left;
    else if (dx > 0 && this.vpos.x > b.right) this.vpos.x = b.right;
    if (dy < 0 && this.vpos.y < b.top) this.vpos.y = b.top;
    else if (dy > 0 && this.vpos.y > b.bottom) this.vpos.y = b.bottom;
  }

  /** Sprite name for the current frame (used by the render layer). */
  determineSprite(): string {
    const facing = this.facingX === 1 ? 1 : 0;
    let animType: string;
    let frame: number;

    if (this.fallingState === FallingState.FALLING) {
      // Python: out of health while falling, flash on and off for a short while
      // (frame > 60 and (frame // 10) % 2 == 0 -> not drawn).
      if (this.frame > 60 && this.health <= 0 && Math.floor(this.frame / 10) % 2 === 0) {
        return 'blank';
      }
      if (this.justKnockedOffScooter) {
        // Python: "we've only just fallen off a scooter, play knocked_off frame 0
        // before continuing from knockdown frame 1". The transition back (frame > 10,
        // which also spawns the independent Scooter) happens in the game update loop.
        animType = 'knocked_off';
        frame = 0;
      } else if (this.useDieAnimation) {
        animType = 'die';
        frame = Math.min(Math.floor(this.frame / 20), 2);
      } else {
        animType = 'knockdown';
        // Python: the scooterboy's knockdown has one extra frame (last_frame 3 vs 2).
        frame = Math.min(Math.floor(this.frame / 10), this.knockdownLastFrame());
      }
    } else if (this.fallingState === FallingState.GETTING_UP) {
      animType = 'getup';
      frame = Math.min(Math.floor(this.frame / 10), 1);
    } else if (this.fallingState === FallingState.GRABBED) {
      return 'blank';
    } else if (this.fallingState === FallingState.THROWN) {
      animType = 'thrown';
      frame = Math.min(Math.floor(this.frame / 12), 3);
    } else if (this.hitTimer > 0) {
      animType = 'hit';
      frame = this.hitFrame;
    } else if (this.pickupAnimation) {
      animType = `pickup_${this.pickupAnimation}`;
      // Python animates the pickup: frame = min(frame // 12, weapon.end_pickup_frame)
      // (barrel end_pickup_frame=2, stick/chain=1) — not a fixed frame 0.
      frame = Math.min(Math.floor(this.frame / 12), this.weapon?.endPickupFrame ?? 0);
    } else if (this.attackTimer > 0 && this.lastAttack) {
      animType = this.lastAttack.sprite ?? 'attack';
      frame = this.lastAttack.frameAt(this.frame);
    } else if (this.walking) {
      animType = 'walk';
      frame = Math.floor(this.frame / this.animUpdateRate) % 4;
    } else {
      animType = this.weapon ? 'walk' : 'stand';
      frame = 0;
      // Python: the weapon name is added to the walking/standing animation ONLY —
      // "This isn't done for weapon attack animations, because barrel is released
      // during the throw animation" — and NOT for pickup/hit/falling either, whose
      // sprite families have no weapon variants. Hoisting this out of the branch
      // produced nonexistent names like hero_pickup_barrel_barrel (the holder
      // vanished during every pickup) and hero_hit_stick (vanishing when hit).
      if (this.weapon) animType += `_${this.weapon.name}`;
    }

    let image = `${this.sprite}_${animType}_${facing}_${frame}`;
    if (this.colourVariant !== null) image += `_${this.colourVariant}`;
    return image;
  }

  /** Called when the fighter is added to the game (its stage is reached). */
  spawned(): void {}

  /** True for the player character. */
  isPlayer(): boolean {
    return false;
  }

  /** True for enemies. */
  isEnemy(): boolean {
    return false;
  }

  // -- abstract hooks -------------------------------------------------

  /** Sort/draw-order nuance: default 0, subclasses may raise it. */
  getDrawOrderOffset(): number {
    return 0;
  }

  protected overrideWalking(): boolean {
    return false;
  }

  /** Python's knockdown last_frame: 2 for everyone, 3 for the scooterboy. */
  protected knockdownLastFrame(): number {
    return 2;
  }

  protected abstract determineAttack(): Attack | null;
  protected abstract determinePickUpWeapon(): boolean;
  protected abstract determineDropWeapon(): boolean;
  protected abstract getOpponents(): Fighter[];
  protected abstract getMoveTarget(): Vec2;
  protected abstract getDesiredFacing(): number | null;
}

/** Move n towards target by speed, returning [newValue, direction]. */
export function moveTowards(n: number, target: number, speed: number): [number, number] {
  if (n < target) return [Math.min(n + speed, target), 1];
  if (n > target) return [Math.max(n - speed, target), -1];
  return [n, 0];
}
