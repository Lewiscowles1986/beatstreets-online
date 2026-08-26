import { Vec2 } from '../core/math';
import { GameContext } from './fighter';

/** A collectible powerup that applies an effect to the collector on collection. */
export abstract class Powerup {
  vpos: Vec2;
  collected = false;

  protected constructor(
    protected game: GameContext,
    pos: Vec2,
    public readonly spriteName: string,
  ) {
    this.game = game;
    this.vpos = pos;
  }

  update(): void {
    // Base powerups are stationary; subclasses may animate (e.g. extra life).
  }

  /** Mark collected and apply the effect to the collector. */
  collect(collector: { health: number; startHealth: number; gainExtraLife(): void }): void {
    this.collected = true;
    this.apply(collector);
  }

  protected abstract apply(collector: { health: number; startHealth: number; gainExtraLife(): void }): void;
}

/** Restores a chunk of health, capped at the collector's max. */
export class HealthPowerup extends Powerup {
  constructor(game: GameContext, pos: Vec2, private readonly amount = 20) {
    super(game, pos, 'health_pickup');
  }

  protected apply(collector: { health: number; startHealth: number; gainExtraLife(): void }): void {
    collector.health = Math.min(collector.health + this.amount, collector.startHealth);
    this.game.playSound('health', 1);
  }
}

/** Grants an extra life; animates through the life-icon frames. */
export class ExtraLifePowerup extends Powerup {
  private timer = 0;

  constructor(game: GameContext, pos: Vec2) {
    super(game, pos, 'ingame_life9');
  }

  override update(): void {
    super.update();
    this.timer += 1;
  }

  /** The life-icon sprite for the current animation frame. */
  sprite(): string {
    return `ingame_life${(this.timer / 2) % 10 | 0}`;
  }

  protected apply(collector: { health: number; startHealth: number; gainExtraLife(): void }): void {
    collector.gainExtraLife();
    this.game.playSound('health', 1);
  }
}
