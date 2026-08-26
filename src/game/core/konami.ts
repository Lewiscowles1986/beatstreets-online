/**
 * Konami code detection — the classic cheat sequence that unlocks the cheat menu.
 * Works across any controller: directions (0..7 8-way angles) and the A (button 0) /
 * B (button 1) actions, regardless of whether they came from a keyboard, gamepad or
 * WebSocket.
 *
 * Sequence (up, up, down, down, left, right, left, right, B, A):
 *   0 up, 1 up, 2 down, 3 down, 4 left, 5 right, 6 left, 7 right, 8 B, 9 A
 */
export const KONAMI = [
  'up',
  'up',
  'down',
  'down',
  'left',
  'right',
  'left',
  'right',
  'b',
  'a',
];

/** The 8-way angle tokens that map onto the Konami directions. */
export const DIR_TO_ANGLE: Record<string, number> = {
  up: 0,
  'up-right': 1,
  right: 2,
  'down-right': 3,
  down: 4,
  'down-left': 5,
  left: 6,
  'up-left': 7,
};

export class KonamiDetector {
  private position = 0;

  /** Feed one step and return true when the full sequence has just completed. */
  feed(token: string): boolean {
    const expected = KONAMI[this.position];
    const match = token.toLowerCase() === expected;
    if (match) {
      this.position += 1;
      if (this.position >= KONAMI.length) {
        this.position = 0; // reset so the code can be entered again
        return true;
      }
    } else if (token !== expected && token !== '') {
      // A non-matching (but real) input resets the sequence.
      this.position = token === KONAMI[0] ? 1 : 0;
    }
    return false;
  }

  reset(): void {
    this.position = 0;
  }

  get progress(): number {
    return this.position;
  }
}
