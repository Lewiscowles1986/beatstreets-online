/**
 * Konami code detection — the cheat sequence that unlocks the cheat menu.
 * Works across any controller: directions and the A (button 0 / punch) /
 * B (button 1 / kick) actions, regardless of whether they came from a keyboard,
 * gamepad or WebSocket.
 *
 * The Beat Streets sequence is (UP, DOWN, LEFT, RIGHT, LEFT, RIGHT, A, B):
 *   0 up, 1 down, 2 left, 3 right, 4 left, 5 right, 6 A, 7 B
 */
export const KONAMI = [
  'up',
  'down',
  'left',
  'right',
  'left',
  'right',
  'a',
  'b',
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

  /** Feed many tokens (one frame); returns true if the code completes in order. */
  feedMany(tokens: string[]): boolean {
    for (const t of tokens) {
      if (this.feed(t)) return true;
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
