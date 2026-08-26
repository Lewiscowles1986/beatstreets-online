import { describe, it, expect, vi } from 'vitest';
import { EdgeDetector, KeyEdges } from './input';
import { Scene, SceneManager } from './scene';

describe('EdgeDetector', () => {
  it('reports press only on the rising edge', () => {
    const d = new EdgeDetector();
    expect(d.update(false)).toBe(false);
    expect(d.update(true)).toBe(true); // press
    expect(d.update(true)).toBe(false); // held, not repeated
    expect(d.update(false)).toBe(false);
    expect(d.update(true)).toBe(true); // press again
  });
});

describe('KeyEdges', () => {
  it('tracks multiple keys independently', () => {
    const ke = new KeyEdges();
    expect(ke.update('left', true)).toBe(true);
    expect(ke.update('right', true)).toBe(true); // independent key
    expect(ke.update('left', true)).toBe(false); // held
    expect(ke.update('left', false)).toBe(false);
    expect(ke.update('left', true)).toBe(true); // re-press
  });
});

describe('SceneManager', () => {
  it('dispatches update/draw to the current scene', () => {
    const updates = vi.fn();
    const draws = vi.fn();
    const scene: Scene = {
      update: (dt = 0) => updates(dt),
      draw: () => draws(),
    };
    const mgr = new SceneManager();
    mgr.add('play', scene);
    mgr.switch('play');
    mgr.update(0.5);
    mgr.draw();
    expect(updates).toHaveBeenCalledWith(0.5);
    expect(draws).toHaveBeenCalled();
  });

  it('throws on unknown scene switch', () => {
    const mgr = new SceneManager();
    expect(() => mgr.switch('nope')).toThrow(/unknown scene/);
  });
});
