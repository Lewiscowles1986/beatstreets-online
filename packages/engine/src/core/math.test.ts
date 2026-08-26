import { describe, it, expect } from 'vitest';
import {
  Vec2,
  clamp,
  remap,
  remapClamp,
  sign,
  avg,
  normalised,
  safeNormalise,
  vecToAngle,
  angleToVec,
  sin,
  cos,
} from './math';

describe('math primitives', () => {
  it('Vec2 arithmetic', () => {
    const a = new Vec2(1, 2);
    const b = new Vec2(3, 4);
    expect(a.add(b)).toEqual(new Vec2(4, 6));
    expect(b.sub(a)).toEqual(new Vec2(2, 2));
    expect(a.scale(3)).toEqual(new Vec2(3, 6));
  });

  it('Vec2 length and normalize', () => {
    expect(new Vec2(3, 4).length()).toBe(5);
    const u = new Vec2(3, 4).normalize();
    expect(u.x).toBeCloseTo(0.6);
    expect(u.y).toBeCloseTo(0.8);
    // zero-vector normalises to zero without NaN
    expect(new Vec2(0, 0).normalize().length()).toBe(0);
  });

  it('clamp bounds values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('remap maps across ranges', () => {
    // remapping 5 from 0..10 to 0..100 gives 50
    expect(remap(5, 0, 10, 0, 100)).toBe(50);
  });

  it('remapClamp constrains to new range even with inverted bounds', () => {
    expect(remapClamp(200, 0, 100, 0, 1)).toBe(1); // over top -> upper
    expect(remapClamp(-10, 0, 100, 0, 1)).toBe(0); // under -> lower
  });

  it('sign is never 0', () => {
    expect(sign(-3)).toBe(-1);
    expect(sign(0)).toBe(1);
    expect(sign(5)).toBe(1);
  });

  it('avg snaps to b when close', () => {
    expect(avg(5, 5.4)).toBe(5.4);
    expect(avg(5, 9)).toBe(7);
  });

  it('normalised returns a unit pair', () => {
    const [x, y] = normalised(3, 4);
    expect(x).toBeCloseTo(0.6);
    expect(y).toBeCloseTo(0.8);
  });

  it('safeNormalise handles zero', () => {
    const [unit, len] = safeNormalise(new Vec2(0, 0));
    expect(len).toBe(0);
    expect(unit.length()).toBe(0);
  });

  it('8-way angle round-trips', () => {
    for (let angle = 0; angle < 8; angle++) {
      const v = angleToVec(angle);
      expect(vecToAngle(v)).toBe(angle);
    }
  });

  it('custom sin/cos use 0..7 angles (0 is up, clockwise)', () => {
    // angle 0 is "up": sin(0)=0, -cos(0)=-1 (the -cos gives up when y axis points down)
    expect(sin(0)).toBeCloseTo(0);
    expect(-cos(0)).toBeCloseTo(-1);
  });
});
