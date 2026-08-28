/**
 * Pure geometry/vector helpers — a TypeScript port of `arcade_core/math.py`.
 * No rendering, no globals: pure logic that can be unit-tested in isolation.
 *
 * These mirror the actions the Python game performs (clamping, remapping, 8-way
 * angles, safe normalisation) without cloning the pygame API.
 */

/** A 2D vector with the vector arithmetic the game needs. */
export class Vec2 {
  x: number;
  y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  add(o: Vec2): Vec2 {
    return new Vec2(this.x + o.x, this.y + o.y);
  }

  sub(o: Vec2): Vec2 {
    return new Vec2(this.x - o.x, this.y - o.y);
  }

  scale(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s);
  }

  length(): number {
    return Math.hypot(this.x, this.y);
  }

  /** True when x and y match the other vector exactly. */
  equals(o: Vec2): boolean {
    return this.x === o.x && this.y === o.y;
  }

  /** Unit vector, or a zero vector when length is 0. */
  normalize(): Vec2 {
    const len = this.length();
    if (len === 0) return new Vec2(0, 0);
    return new Vec2(this.x / len, this.y / len);
  }

  toString(): string {
    return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }
}

/**
 * Custom sine for angles in 0..7, where 0 is up and increments go clockwise
 * (mirrors arcade_core.math.sin).
 */
export function sin(x: number): number {
  return Math.sin((x * Math.PI) / 4);
}

/** Custom cosine (offset sine) for angles in 0..7. */
export function cos(x: number): number {
  return sin(x + 2);
}

/** Convert a Vec2 to an 8-way angle in 0..7 (mirrors vec_to_angle). */
export function vecToAngle(v: Vec2): number {
  return Math.trunc((4 * Math.atan2(v.x, -v.y)) / Math.PI + 8.5) % 8;
}

/** Convert an 8-way angle in 0..7 to a direction Vec2 (mirrors angle_to_vec). */
export function angleToVec(angle: number): Vec2 {
  return new Vec2(sin(angle), -cos(angle));
}

/**
 * Return a sort key function yielding distance from `pos` to an object with a
 * `vpos` field (mirrors arcade_core.math.dist_key).
 */
export function distKey(pos: Vec2): (obj: { vpos: Vec2 }) => number {
  return (obj) => obj.vpos.sub(pos).length();
}

/** Return `(unit_vector, original_length)`, safely handling a zero vector. */
export function safeNormalise(vec: Vec2): [Vec2, number] {
  const len = vec.length();
  if (len === 0) return [new Vec2(0, 0), 0];
  return [vec.normalize(), len];
}

/** Sign of x: -1 if negative, else 1 (never 0) — mirrors arcade_core.math.sign. */
export function sign(x: number): number {
  return x < 0 ? -1 : 1;
}

/** Unit vector from components (mirrors arcade_core.math.normalised). */
export function normalised(x: number, y: number): [number, number] {
  const len = Math.hypot(x, y);
  return [x / len, y / len];
}

/** Average of a and b, snapping to b when they are close (<1 apart). */
export function avg(a: number, b: number): number {
  return Math.abs(b - a) < 1 ? b : (a + b) / 2;
}

/** Clamp value into [low, high]. */
export function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

/** Remap a number from one range to another. */
export function remap(oldVal: number, oldMin: number, oldMax: number, newMin: number, newMax: number): number {
  return ((newMax - newMin) * (oldVal - oldMin)) / (oldMax - oldMin) + newMin;
}

/** Like remap, but constrained to the new range (handles inverted ranges). */
export function remapClamp(oldVal: number, oldMin: number, oldMax: number, newMin: number, newMax: number): number {
  const lower = Math.min(newMin, newMax);
  const upper = Math.max(newMin, newMax);
  return Math.min(upper, Math.max(lower, remap(oldVal, oldMin, oldMax, newMin, newMax)));
}

/** Random integer in [min, max] inclusive. `rng` must be supplied — bare `Math.random`
 * defaults are removed so all engine randomness flows through the injectable RNG. */
export function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Random element from an array. */
export function choice<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export const math = {
  Vec2,
  sin,
  cos,
  vecToAngle,
  angleToVec,
  distKey,
  safeNormalise,
  sign,
  normalised,
  avg,
  clamp,
  remap,
  remapClamp,
};
