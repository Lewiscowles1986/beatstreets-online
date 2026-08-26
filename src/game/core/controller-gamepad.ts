import { Controller, GameButton } from './controller';

/**
 * A Browser Gamepad API adapter. Maps the game's 4 logical buttons to gamepad button
 * indices (0..3) and the left stick/hat to movement, with a dead-zone.
 * Mirrors the Python `JoystickControls` behaviour.
 */
export interface GamepadLike {
  id: string;
  buttons: Array<{ pressed: boolean }>;
  axes: number[];
  hat?: [number, number];
}

export class GamepadController extends Controller {
  private edges: boolean[] = [false, false, false, false];
  private previous: boolean[] = [false, false, false, false];

  constructor(
    private readonly gamepad: GamepadLike,
    name?: string,
    private readonly deadZone = 0.6,
  ) {
    super(name ?? `gamepad-${gamepad.id}`);
  }

  private rawButton(index: number): boolean {
    return this.gamepad.buttons.length > index && this.gamepad.buttons[index].pressed;
  }

  override update(): void {
    for (let b = 0 as GameButton; b <= 3; b++) {
      const down = this.rawButton(b);
      this.edges[b] = down && !this.previous[b];
      this.previous[b] = down;
    }
  }

  override getX(): number {
    return this.axisValue(0);
  }

  override getY(): number {
    return this.axisValue(1);
  }

  private axisValue(axis: number): number {
    // Hat takes precedence when active (mirrors get_axis in the Python game).
    const hat = this.gamepad.hat;
    if (hat && hat[axis] !== 0) {
      // On some pads the y hat is inverted; we keep the raw sign for simplicity.
      return hat[axis];
    }
    const v = this.gamepad.axes[axis] ?? 0;
    if (Math.abs(v) < this.deadZone) return 0;
    return v > 0 ? 1 : -1;
  }

  override held(button: GameButton): boolean {
    return this.rawButton(button);
  }

  override pressed(button: GameButton): boolean {
    return this.edges[button];
  }
}

/** Resolve a browser `navigator.getGamepads()` snapshot into {@link GamepadLike}s. */
export function gamepadSnapshot(
  getGamepads: () => (Gamepad | null)[],
): GamepadLike[] {
  const out: GamepadLike[] = [];
  for (const pad of getGamepads()) {
    if (!pad) continue;
    out.push({
      id: pad.id,
      buttons: pad.buttons.map((b) => ({ pressed: b.pressed })),
      axes: [...pad.axes],
      hat: undefined,
    });
  }
  return out;
}
