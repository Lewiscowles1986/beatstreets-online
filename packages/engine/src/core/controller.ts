/**
 * Reusable, hot-pluggable controller system — a TypeScript port of
 * `arcade_core/controllers.py`.
 *
 * A game asks a `ControllerRegistry` for `anyHeld("fire")` / `anyPressed("fire")` and
 * does not care whether the input comes from a keyboard, a gamepad, a WebSocket, or an
 * AI script. Controllers can be added/removed at runtime (hot-plug).
 *
 * This is the abstraction that lets Beat Streets be driven not just by the keyboard
 * but by a game controller or over a WebSocket.
 */

/** The logical buttons the game listens for (button 0..3 + direction). */
export type GameButton = 0 | 1 | 2 | 3;

export interface ControllerInput {
  /** Current movement axis in [-1, 1]. */
  getX(): number;
  getY(): number;
  /** True if the named logical button is held. */
  held(button: GameButton): boolean;
  /** True if the named logical button was just pressed (rising edge) this frame. */
  pressed(button: GameButton): boolean;
}

/**
 * Base class for a control source. Subclasses read a concrete input source and call
 * `update()` once per frame to drive edge detection.
 */
export abstract class Controller implements ControllerInput {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  /** Poll the input source once per frame (drives edge detection). */
  abstract update(): void;

  getX(): number {
    return 0;
  }

  getY(): number {
    return 0;
  }

  held(_button: GameButton): boolean {
    return false;
  }

  pressed(_button: GameButton): boolean {
    return false;
  }
}

/** A keyboard-as-controller adapter, driven by an event-based "is key down" query. */
export class KeyboardController extends Controller {
  private edges: boolean[] = [false, false, false, false];
  private previous: boolean[] = [false, false, false, false];

  /**
   * @param isDown A function answering "is this key currently down?" for a logical
   *   action. The default maps button 0..3 to punch/kick/elbow/flying-kick keys and
   *   uses a supplied axis provider for direction.
   */
  constructor(
    name = 'keyboard',
    private readonly keyState: (button: GameButton) => boolean,
    private readonly axis: () => { x: number; y: number },
  ) {
    super(name);
  }

  override update(): void {
    for (let b = 0 as GameButton; b <= 3; b++) {
      const down = this.keyState(b);
      this.edges[b] = down && !this.previous[b];
      this.previous[b] = down;
    }
  }

  override getX(): number {
    return this.axis().x;
  }

  override getY(): number {
    return this.axis().y;
  }

  override held(button: GameButton): boolean {
    return this.keyState(button);
  }

  override pressed(button: GameButton): boolean {
    return this.edges[button];
  }
}

/** A registry of controllers; reconciles hot-plugging and merges any-* queries. */
export class ControllerRegistry {
  private controllers = new Map<string, Controller>();

  add(key: string, controller: Controller): Controller {
    this.controllers.set(key, controller);
    return controller;
  }

  remove(key: string): Controller | undefined {
    const c = this.controllers.get(key);
    this.controllers.delete(key);
    return c;
  }

  /** Drop all controllers (used when tearing down / switching scenes). */
  clear(): void {
    this.controllers.clear();
  }

  /** Update every controller once per frame. */
  updateAll(): void {
    for (const c of this.controllers.values()) c.update();
  }

  list(): Controller[] {
    return [...this.controllers.values()];
  }

  anyHeld(button: GameButton): boolean {
    return this.list().some((c) => c.held(button));
  }

  anyPressed(button: GameButton): boolean {
    return this.list().some((c) => c.pressed(button));
  }

  /** Aggregate movement: sum of x across controllers, clamped to [-1,1]. */
  axis(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    for (const c of this.list()) {
      x += c.getX();
      y += c.getY();
    }
    return { x: clampUnit(x), y: clampUnit(y) };
  }
}

function clampUnit(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

export const controllers = { Controller, KeyboardController, ControllerRegistry };
