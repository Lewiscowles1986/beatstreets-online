import { Fighter, GameContext, FallingState } from './fighter';
import { Attack } from './attack';
import { Character } from '../dsl/characters';
import { Vec2, clamp, sign, randInt, choice } from '../core/math';/** Enemy behaviour states (mirrors Enemy.State). */
export enum EnemyState {
  APPROACH_PLAYER = 0,
  GO_TO_POS = 1,
  GO_TO_WEAPON = 2,
  PAUSE = 3,
  KNOCKED_DOWN = 4,
  RIDING_SCOOTER = 5,
  PORTAL = 6,
  PORTAL_EXPLODE = 7,
}

/**
 * Base enemy. Uses a simple state machine to decide whether to approach the player,
 * walk to a point, pick up a weapon, pause, or (if knocked down) stay down.
 */
export abstract class Enemy extends Fighter {
  state = EnemyState.PAUSE;
  stateTimer: number;
  target: Vec2;
  targetWeapon: Fighter['weapon'] | null = null;
  attacks: string[];
  approachPlayerDistance: number;
  score: number;

  constructor(
    game: GameContext,
    char: Character,
    pos: Vec2,
    opts: {
      startTimer?: number;
      colourVariant?: number | null;
      score?: number;
    } = {},
  ) {
    super(game, pos, new Vec2(...(toVec(char.speed))), char.name, char.health ?? 15, {
      stamina: char.stamina ?? 500,
      halfHitArea: char.half_hit_area ? new Vec2(char.half_hit_area[0], char.half_hit_area[1]) : undefined,
      animUpdateRate: 14,
      colourVariant: opts.colourVariant ?? null,
      anchorY: char.anchor_y ?? 256,
    });
    this.attacks = char.attacks ?? [];
    this.approachPlayerDistance = char.approach_player_distance ?? 85;
    this.score = opts.score ?? char.score ?? 10;
    this.target = this.vpos.clone();
    this.state = EnemyState.PAUSE;
    this.stateTimer = opts.startTimer ?? 20;
  }

  override spawned(): void {}

  override isEnemy(): boolean {
    return true;
  }

  override update(): void {
    const player = this.game.getEnemies()[0]; // not used here; placeholder for parity
    void player;
    switch (this.state) {
      case EnemyState.APPROACH_PLAYER:
        this.updateApproach();
        break;
      case EnemyState.GO_TO_POS:
        if (this.target.equals(this.vpos)) this.makeDecision();
        break;
      case EnemyState.GO_TO_WEAPON:
        this.updateGoToWeapon();
        break;
      case EnemyState.PAUSE:
        this.stateTimer -= 1;
        if (this.stateTimer < 0) this.makeDecision();
        break;
      case EnemyState.KNOCKED_DOWN:
        if (this.fallingState === FallingState.STANDING) this.makeDecision();
        break;
      default:
        break;
    }

    if (
      this.state === EnemyState.APPROACH_PLAYER ||
      this.state === EnemyState.GO_TO_POS ||
      this.state === EnemyState.GO_TO_WEAPON
    ) {
      this.clampTarget();
    }

    super.update();
  }

  private updateApproach(): void {
    const player = this.player();
    // Head towards the player at the configured approach distance.
    this.target.x = player.vpos.x + this.approachPlayerDistance * sign(this.vpos.x - player.vpos.x);
    this.target.y = player.vpos.y;
  }

  private updateGoToWeapon(): void {
    const w = this.targetWeapon;
    if (!w || !w.can_be_picked_up()) {
      this.targetWeapon = null;
      this.makeDecision();
      return;
    }
    this.target = w.vpos.clone();
    if (this.target.equals(this.vpos)) {
      this.pickupAnimation = w.name;
      this.frame = 0;
      w.pick_up(Fighter.WEAPON_HOLD_HEIGHT);
      this.weapon = w;
      this.targetWeapon = null;
      this.makeDecision();
    }
  }

  private clampTarget(): void {
    const b = this.game.boundary;
    this.target.x = clamp(this.target.x, b.left, b.right);
    this.target.y = clamp(this.target.y, b.top, b.bottom);
  }

  makeDecision(): void {
    const player = this.player();
    // If the only enemy, always advance to attack.
    if (this.game.getEnemies().length === 1) {
      this.state = EnemyState.APPROACH_PLAYER;
      return;
    }
    const r = randInt(0, 9);
    if (r < 7) {
      // Attack the player from their side; flank if another enemy already is.
      const sameSide = this.game
        .getEnemies()
        .some(
          (e) =>
            e !== this &&
            e instanceof Enemy &&
            e.state === EnemyState.APPROACH_PLAYER &&
            sign(e.vpos.x - player.vpos.x) === sign(this.vpos.x - player.vpos.x),
        );
      if (sameSide) {
        this.state = EnemyState.GO_TO_POS;
        this.target.x = player.vpos.x - sign(this.vpos.x - player.vpos.x) * 50;
        this.target.y = player.vpos.y + sign(this.vpos.y - player.vpos.y) * 50;
        if (this.target.y === player.vpos.y) this.target.y = player.vpos.y + choice([-1, 1]) * 50;
      } else {
        this.state = EnemyState.APPROACH_PLAYER;
      }
    } else if (r < 9) {
      const xSide = sign(this.vpos.x - player.vpos.x) || choice([1, -1]);
      const x1 = player.vpos.x + 150 * xSide;
      const x2 = player.vpos.x + 400 * xSide;
      this.target = new Vec2(randInt(Math.min(x1, x2), Math.max(x1, x2)), randInt(this.game.boundary.top, this.game.boundary.bottom));
      this.state = EnemyState.GO_TO_POS;
    } else {
      this.stateTimer = randInt(50, 100);
      this.state = EnemyState.PAUSE;
    }
  }

  protected override determineAttack(): Attack | null {
    const player = this.player();
    if (
      this.state === EnemyState.APPROACH_PLAYER &&
      player.fallingState === FallingState.STANDING &&
      this.vpos.y === player.vpos.y &&
      this.approachPlayerDistance * 0.9 < Math.abs(this.vpos.x - player.vpos.x) &&
      Math.abs(this.vpos.x - player.vpos.x) <= this.approachPlayerDistance * 1.1 &&
      randInt(0, 19) === 0
    ) {
      if (this.weapon) return this.game.getAttack(this.weapon.name) ? new Attack(this.game.getAttack(this.weapon.name)!) : null;
      const name = choice(this.attacks);
      const spec = this.game.getAttack(name);
      if (!spec) return null;
      const attack = new Attack(spec);
      // A grab is not allowed while the player is doing a flying kick.
      if (attack.grab && player.lastAttack?.flyingKick) return null;
      return attack;
    }
    return null;
  }

  protected override determinePickUpWeapon(): boolean {
    return false;
  }

  protected override determineDropWeapon(): boolean {
    return false;
  }

  protected override getOpponents(): Fighter[] {
    return [this.player()];
  }

  protected override getMoveTarget(): Vec2 {
    return this.target;
  }

  protected override getDesiredFacing(): number | null {
    return this.vpos.x < this.player().vpos.x ? 1 : -1;
  }

  override hit(hitter: unknown, attack: Attack): void {
    if (this.state === EnemyState.KNOCKED_DOWN) return;
    super.hit(hitter, attack);
    if (this.fallingState === FallingState.FALLING) {
      this.state = EnemyState.KNOCKED_DOWN;
    }
  }

  private player(): Fighter {
    // Enemies fight the player (index 0 of the enemies list from the game's POV is
    // the player; getEnemies returns only enemies, so expose player separately).
    return this.game.getPlayer();
  }
}

function toVec(speed: Character['speed'] | undefined): [number, number] {
  if (Array.isArray(speed)) return [speed[0], speed[1]];
  return [speed ?? 1, speed ?? 1];
}

