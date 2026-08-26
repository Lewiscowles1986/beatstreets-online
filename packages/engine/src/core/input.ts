/**
 * Shared input edge-detection helpers — a TypeScript port of `arcade_core/input.py`.
 *
 * A button is reported as pressed only on the *rising edge* (down now, up previously),
 * so holding a key does not repeat the action. Matches the games' original semantics.
 */

/** Rising-edge detector for a single boolean input. */
export class EdgeDetector {
  private prev: boolean;

  constructor(initial = false) {
    this.prev = Boolean(initial);
  }

  /** Returns true exactly when `isDown` is true and was false on the previous call. */
  update(isDown: boolean): boolean {
    const down = Boolean(isDown);
    const pressed = down && !this.prev;
    this.prev = down;
    return pressed;
  }
}

/** Rising-edge detector for many named keys. */
export class KeyEdges {
  private prev = new Map<string, boolean>();

  /** Returns true on the rising edge of the named key. */
  update(key: string, isDown: boolean): boolean {
    const down = Boolean(isDown);
    const wasDown = this.prev.get(key) ?? false;
    this.prev.set(key, down);
    return down && !wasDown;
  }

  reset(): void {
    this.prev.clear();
  }
}
