import { Vec2 } from '../core/math';
import { Attack } from './attack';
import { GameContext, Fighter, FallingState, WeaponLike } from './fighter';

/**
 * Weapons in Beat Streets: barrel (rolled/thrown), and breakable melee weapons
 * (stick/chain). Ported from the Python `Weapon`/`Barrel`/`BreakableWeapon` classes.
 * Weapons obey gravity/friction, can be picked up, held, thrown, and (if breakable)
 * wear out and break.
 */
export abstract class Weapon implements WeaponLike {
  name: string;
  vpos: Vec2;
  held = false;
  vel = new Vec2(0, 0);
  heightAboveGround = 0;
  endPickupFrame: number;
  bounciness: number;
  groundFriction: number;
  airFriction: number;
  frame = 0;

  protected constructor(
    protected game: GameContext,
    name: string,
    pos: Vec2,
    endPickupFrame: number,
    opts: { bounciness?: number; groundFriction?: number; airFriction?: number } = {},
  ) {
    this.game = game;
    this.name = name;
    this.vpos = pos;
    this.endPickupFrame = endPickupFrame;
    this.bounciness = opts.bounciness ?? 0;
    this.groundFriction = opts.groundFriction ?? 0.5;
    this.airFriction = opts.airFriction ?? 0.996;
  }

  update(): void {
    if (this.held) return;
    // Fall to ground (gravity).
    if (this.heightAboveGround > 0 || this.vel.y !== 0) {
      this.vel.y += this.game.config.WEAPON_GRAVITY;
      if (this.vel.y > this.heightAboveGround) {
        if (this.bounciness > 0 && this.vel.y > 1) {
          this.heightAboveGround = Math.abs(this.heightAboveGround - this.vel.y) * this.bounciness;
          this.vel.y = -this.vel.y * this.bounciness;
        } else {
          this.heightAboveGround = 0;
          this.vel.y = 0;
        }
      } else {
        this.heightAboveGround -= this.vel.y;
      }
      if (this.heightAboveGround < 0) this.heightAboveGround = 0;
    }
    // Horizontal movement + friction.
    this.vpos.x += this.vel.x;
    const friction = this.heightAboveGround === 0 ? this.groundFriction : this.airFriction;
    this.vel.x *= friction;
    if (Math.abs(this.vel.x) < 0.05) this.vel.x = 0;
  }

  can_be_picked_up(): boolean {
    return !this.held && this.heightAboveGround === 0;
  }

  pick_up(holdHeight: number): void {
    this.held = true;
    this.heightAboveGround = holdHeight;
    this.vel = new Vec2(0, 0);
  }

  dropped(): void {
    this.held = false;
  }

  used(): void {
    // Overridable: a weapon may wear out.
  }

  is_broken(): boolean {
    return false;
  }

  /** Python get_draw_order_offset: weapons sort into the same list as fighters
   *  (vpos.y + offset); base weapons 0, subclasses override. */
  getDrawOrderOffset(): number {
    return 0;
  }

  abstract throw(dirX: number, thrower: unknown): void;
}

/** A barrel: rolls, bounces, and can bash fighters when moving. */
export class Barrel extends Weapon {
  private lastThrower: Fighter | null = null;

  constructor(game: GameContext, pos: Vec2) {
    super(game, 'barrel', pos, 2, { bounciness: 0.75, groundFriction: 0.96 });
  }

  override update(): void {
    super.update();
    // Bash fighters when moving and not pick-up-able (too fast).
    if (!this.held && !this.can_be_picked_up() && this.vel.x !== 0) {
      const spec = this.game.getAttack('barrel');
      if (spec) {
        const attack = new Attack(spec);
        const barrelHeight = 40;
        const barrelBottom = this.heightAboveGround - barrelHeight / 2;
        const barrelTop = barrelBottom + barrelHeight;
        for (const fighter of [this.game.getPlayer(), ...this.game.getEnemies()]) {
          if (
            fighter !== this.lastThrower &&
            fighter.fallingState === FallingState.STANDING &&
            Math.abs(fighter.vpos.y - this.vpos.y) < 30 &&
            Math.abs(this.vpos.x - fighter.vpos.x) < 30 &&
            fighter.heightAboveGround < barrelTop
          ) {
            fighter.hit(this, attack);
          }
        }
      }
      // Python increments the roll frame ONLY while rolling (it drives the
      // (frame // 14) % 4 roll animation); a resting barrel's phase must not advance.
      this.frame += 1;
    }
  }

  throw(dirX: number, thrower: unknown): void {
    this.dropped();
    this.vel.x = dirX * this.game.config.BARREL_THROW_VEL_X;
    this.vel.y = this.game.config.BARREL_THROW_VEL_Y;
    this.lastThrower = thrower instanceof Fighter ? thrower : null;
    this.vpos.x += dirX * 104;
  }

  override can_be_picked_up(): boolean {
    return super.can_be_picked_up() && this.vel.length() < 1;
  }

  override getDrawOrderOffset(): number {
    return 2;
  }

  /** A representative sprite name for rendering. */
  sprite(): string {
    const facing = this.vel.x > 0 ? 1 : 0;
    return `barrel_roll_${facing}_${(this.frame / 14) % 4 | 0}`;
  }
}

/** A melee weapon that wears out after a number of uses. */
export class BreakableWeapon extends Weapon {
  breakCounter: number;
  spriteName: string;

  protected constructor(game: GameContext, pos: Vec2, name: string, durability: number) {
    super(game, name, pos, 1);
    this.spriteName = name;
    this.breakCounter = durability;
  }

  override used(): void {
    this.breakCounter -= 1;
    if (this.breakCounter <= 0) this.onBreak();
  }

  override is_broken(): boolean {
    return this.breakCounter <= 0;
  }

  override getDrawOrderOffset(): number {
    // Python: -50 — a stick/chain on the ground draws BEHIND a character standing
    // on it (see BreakableWeapon.get_draw_order_offset).
    return -50;
  }

  throw(dirX: number, _thrower: unknown): void {
    this.dropped();
    this.vel.x = dirX * 3;
    this.vel.y = -2;
  }

  protected onBreak(): void {
    this.game.playSound(`${this.name}_break`);
  }
}

export class Stick extends BreakableWeapon {
  constructor(game: GameContext, pos: Vec2, durability?: number) {
    super(game, pos, 'stick', durability ?? game.rng.randint(12, 16));
  }
}

export class Chain extends BreakableWeapon {
  constructor(game: GameContext, pos: Vec2, durability?: number) {
    super(game, pos, 'chain', durability ?? game.rng.randint(18, 25));
  }
}
