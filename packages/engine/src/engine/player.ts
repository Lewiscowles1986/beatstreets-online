import { Fighter, GameContext } from './fighter';
import { Attack } from './attack';
import { ControllerInput } from '../core/controller';
import { Vec2, sign } from '../core/math';

/**
 * The player character. Reads its movement/actions from a {@link ControllerInput}
 * (keyboard / gamepad / websocket — all look the same to the game).
 */
export class Player extends Fighter {
  controls: ControllerInput;
  extraLifeTimer = 0;

  constructor(game: GameContext, controls: ControllerInput) {
    super(game, new Vec2(400, 400), new Vec2(3, 2), 'hero', 30, {
      anchorY: 256,
      stamina: 500,
      lives: 3,
      colourVariant: null,
    });
    this.controls = controls;
  }

  override update(): void {
    super.update();
    this.extraLifeTimer -= 1;
  }

  override getDrawOrderOffset(): number {
    return 1;
  }

  override isPlayer(): boolean {
    return true;
  }

  protected override determineAttack(): Attack | null {
    if (this.weapon) {
      if (this.pickupAnimation === null && this.controls.pressed(0)) {
        return attackByName(this.game, this.weapon.name);
      }
    } else if (this.controls.pressed(0)) {
      // In a combo? (punch chain -> secondpunch -> uppercut)
      if (this.lastAttack && this.lastAttack.comboNext && this.attackTimer >= -30) {
        if (this.lastAttack.comboNext[0]) return attackByName(this.game, this.lastAttack.comboNext[0]);
      }
      return attackByName(this.game, 'punch');
    } else if (this.controls.pressed(1)) {
      const pick = this.game.rng.random() < 0.5 ? 'kick' : 'highkick';
      return attackByName(this.game, pick);
    } else if (this.controls.pressed(2)) {
      return attackByName(this.game, 'elbow');
    } else if (this.controls.pressed(3)) {
      return attackByName(this.game, 'flyingkick');
    }
    return null;
  }

  protected override determinePickUpWeapon(): boolean {
    return this.controls.pressed(0);
  }

  protected override determineDropWeapon(): boolean {
    return this.weapon !== null && this.controls.pressed(1);
  }

  protected override getOpponents(): Fighter[] {
    return this.game.getEnemies();
  }

  protected override getMoveTarget(): Vec2 {
    return this.vpos.add(new Vec2(this.controls.getX() * this.speed.x, this.controls.getY() * this.speed.y));
  }

  protected override getDesiredFacing(): number | null {
    const dx = this.controls.getX();
    if (dx !== 0) return sign(dx);
    return this.facingX;
  }

  gainExtraLife(): void {
    this.lives += 1;
    this.extraLifeTimer = 30;
  }
}

/** Look up an attack from the game's attack table, building it on demand. */
function attackByName(game: GameContext, name: string): Attack | null {
  const spec = game.getAttack(name);
  return spec ? new Attack(spec) : null;
}

